# Future Phases UI Patterns

UI/UX specifications for Phase 2-6 features in SEKAR applications.

**Status:** Planned - Implementation pending
**Last Updated:** 2026-01-21

---

## Overview

This document provides comprehensive UI guidelines for features planned in Phases 2-6 of the SEKAR project. All patterns follow the established design system (Phase 1 MVP) and maintain WCAG AA accessibility compliance.

**Phase Status:**
- Phase 1 MVP: Complete ✅
- Phase 2: Enhanced Features - Planned
- Phase 3: Analytics & Reporting - Planned
- Phase 4: Asset Management - Planned
- Phase 5: iOS & Advanced Features - Planned
- Phase 6: Web Dashboard - Planned

---

# Phase 2: Enhanced Features

## TaskCard Component

Task cards display assigned work items with status, location, and priority indicators.

### Anatomy

```
┌────────────────────────────────────────┐
│ [!] Prioritas Tinggi              [⋮] │  ← Priority badge + menu
├────────────────────────────────────────┤
│ Pemangkasan Rumput Area B              │  ← Task title (xl)
│                                        │
│ 📍 Taman Bungkul - Zona B              │  ← Location (sm, secondary)
│ ⏱ Deadline: 15 Jan 2026, 16:00 WIB    │  ← Due date (sm, secondary)
│                                        │
│ ┌────────────────┐                     │
│ │ □ Siapkan alat │                     │  ← Subtasks (optional)
│ │ □ Potong rumput│                     │
│ │ ✓ Bersihkan    │                     │
│ └────────────────┘                     │
│                                        │
│ ┌──────────────────┐ ┌──────────────┐ │
│ │ ⚠ Belum Mulai    │ │ Mulai Tugas  │ │  ← Status + CTA
│ └──────────────────┘ └──────────────┘ │
└────────────────────────────────────────┘
```

### States

| State | Badge Color | Badge Icon | CTA |
|-------|-------------|------------|-----|
| **Not Started** | `warning` | `alert` | "Mulai Tugas" |
| **In Progress** | `info` | `progress-clock` | "Lanjutkan" |
| **Blocked** | `error` | `alert-circle` | "Lihat Masalah" |
| **Completed** | `success` | `check-circle` | "Lihat Detail" |
| **Overdue** | `error` | `clock-alert` | "Selesaikan Sekarang" |

### Priority Indicators

| Priority | Badge Text | Color | Icon |
|----------|-----------|-------|------|
| **Low** | Prioritas Rendah | `gray500` | `arrow-down` |
| **Medium** | Prioritas Sedang | `warning` | `minus` |
| **High** | Prioritas Tinggi | `error` | `arrow-up` |
| **Urgent** | MENDESAK | `error` | `alert` |

### Specifications

```typescript
// TaskCard Container
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md, // 8px
  padding: spacing.md, // 16px
  marginBottom: spacing.sm, // 8px
  borderLeftWidth: 4,
  borderLeftColor: priorityColor, // Accent strip on left
  ...shadows.sm,
}

// Priority Badge
{
  paddingHorizontal: spacing.sm, // 8px
  paddingVertical: spacing.xs, // 4px
  backgroundColor: priorityColor + '10', // 10% opacity
  borderRadius: borderRadius.full,
  flexDirection: 'row',
  alignItems: 'center',
}

// Task Title
{
  fontSize: typography.fontSize.xl, // 20px
  fontWeight: typography.fontWeight.semibold, // 600
  color: colors.textPrimary,
  marginBottom: spacing.xs, // 4px
}

// Metadata Row
{
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: spacing.xs, // 4px
}

// Status CTA Button
{
  flex: 1,
  height: 44,
  backgroundColor: colors.primary,
  borderRadius: borderRadius.md,
  justifyContent: 'center',
  alignItems: 'center',
}
```

### Usage Example

```tsx
<TaskCard
  task={{
    id: 'task-123',
    title: 'Pemangkasan Rumput Area B',
    location: 'Taman Bungkul - Zona B',
    deadline: '2026-01-15T16:00:00+07:00',
    priority: 'high',
    status: 'not_started',
    subtasks: [
      { id: '1', title: 'Siapkan alat', completed: false },
      { id: '2', title: 'Potong rumput', completed: false },
      { id: '3', title: 'Bersihkan area', completed: true },
    ],
  }}
  onPress={handleTaskPress}
  onStart={handleStartTask}
/>
```

### Accessibility

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={`Tugas ${task.priority} prioritas: ${task.title}. Lokasi ${task.location}. Deadline ${formatDate(task.deadline)}. Status ${task.status}`}
  accessibilityState={{ disabled: task.status === 'completed' }}
>
  {/* Task card content */}
</TouchableOpacity>
```

---

## Notification Badge Design

Notification badges indicate unread counts on tab bar icons and in-app elements.

### Variants

| Variant | Size | Position | Usage |
|---------|------|----------|-------|
| **Dot** | 8×8px | Top-right | Simple indicator (new item) |
| **Count** | 20×20px | Top-right | Numeric count (1-99) |
| **Count Large** | 24×24px | Top-right | Large count (100+) |

### Anatomy

```
Tab Bar Icon with Badge:
┌─────────┐
│    [99+]│  ← Badge (20×20px)
│   📋   │  ← Icon (24×24px)
│ Laporan│  ← Label
└─────────┘
```

### Specifications

```typescript
// Badge Container (Dot)
{
  position: 'absolute',
  top: 0,
  right: 0,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.error, // #F44336
  borderWidth: 1,
  borderColor: colors.white, // Contrast with background
}

// Badge Container (Count)
{
  position: 'absolute',
  top: -4,
  right: -8,
  minWidth: 20,
  height: 20,
  paddingHorizontal: 4,
  backgroundColor: colors.error,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: colors.white,
  justifyContent: 'center',
  alignItems: 'center',
}

// Badge Text
{
  fontSize: 11,
  fontWeight: typography.fontWeight.bold, // 700
  color: colors.white,
  textAlign: 'center',
}
```

### Usage Example

```tsx
// Tab bar icon with badge
<View style={{ position: 'relative' }}>
  <MaterialCommunityIcons name="file-document" size={24} color={tintColor} />
  {unreadCount > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  )}
</View>

// Simple dot indicator
{hasNewNotifications && (
  <View style={styles.badgeDot} />
)}
```

### Accessibility

```tsx
<View
  accessibilityLabel={`Laporan. ${unreadCount} laporan baru`}
  accessibilityRole="button"
>
  {/* Icon with badge */}
</View>
```

---

## FCM Notification UI

Push notification designs for Firebase Cloud Messaging.

### Notification Types

| Type | Icon | Color | Sound | Importance |
|------|------|-------|-------|------------|
| **New Task** | `clipboard-text` | Primary | Default | High |
| **Task Due** | `clock-alert` | Warning | Default | High |
| **Shift Reminder** | `briefcase` | Info | Default | Default |
| **System Alert** | `alert` | Error | Urgent | High |
| **Message** | `message` | Secondary | Default | Default |

### Notification Anatomy

**Android:**
```
┌─────────────────────────────────────┐
│ [Icon] SEKAR               [X]      │  ← App icon, name, close
│ Tugas Baru Diterima                 │  ← Title (bold)
│ Pemangkasan rumput di Taman Bungkul │  ← Body text
│ 2 menit yang lalu                   │  ← Timestamp
│                                     │
│ [Lihat Tugas] [Tandai Selesai]     │  ← Actions (optional)
└─────────────────────────────────────┘
```

**iOS:**
```
┌─────────────────────────────────────┐
│ [Icon] SEKAR               sekarang │
│ Tugas Baru Diterima                 │
│ Pemangkasan rumput di Taman Bungkul │
└─────────────────────────────────────┘
```

### In-App Notification Banner

```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ [!] Tugas Baru         [X]      │ │  ← Banner (slides from top)
│ │ Pemangkasan rumput di Taman ... │ │
│ │ [Lihat]                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│       Main Screen Content           │
└─────────────────────────────────────┘
```

### Specifications

```typescript
// In-App Banner
{
  position: 'absolute',
  top: 60, // Below status bar
  left: spacing.md,
  right: spacing.md,
  backgroundColor: colors.primary,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  flexDirection: 'row',
  alignItems: 'center',
  ...shadows.lg,
  zIndex: 1000,
}

// FCM Notification Payload
{
  notification: {
    title: 'Tugas Baru Diterima',
    body: 'Pemangkasan rumput di Taman Bungkul',
    sound: 'default',
    badge: '1',
    icon: 'ic_notification', // Android
  },
  data: {
    type: 'task_assigned',
    task_id: 'task-123',
    priority: 'high',
    action_url: '/tasks/task-123',
  },
  android: {
    priority: 'high',
    notification: {
      color: '#2E7D32', // Primary green
      channelId: 'tasks',
    },
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
      },
    },
  },
}
```

### Notification Channels (Android)

| Channel | Name | Importance | Sound | Vibrate |
|---------|------|------------|-------|---------|
| **tasks** | Tugas | High | Default | Yes |
| **shifts** | Shift | Default | Default | Yes |
| **messages** | Pesan | Default | Default | No |
| **alerts** | Peringatan | Urgent | Urgent | Yes |

---

# Phase 3: Analytics & Reporting

## Chart Components

Data visualization components for analytics dashboard.

### Bar Chart

Vertical bar chart for comparing values across categories.

```
┌────────────────────────────────────┐
│ Laporan Per Area (Minggu Ini)     │  ← Chart title
├────────────────────────────────────┤
│                                    │
│ 45 ┤                     ██        │
│ 40 ┤             ██      ██        │
│ 35 ┤     ██      ██      ██        │
│ 30 ┤     ██      ██      ██      █ │
│ 25 ┤     ██      ██      ██      █ │
│ 20 ┤     ██      ██      ██      █ │
│ 15 ┤     ██      ██      ██      █ │
│ 10 ┤ ██  ██  ██  ██  ██  ██  ██  █ │
│  5 ┤ ██  ██  ██  ██  ██  ██  ██  █ │
│  0 └─┴───┴───┴───┴───┴───┴───┴───┴─│
│     Sen Sel Rab Kam Jum Sab Ming   │  ← X-axis labels
│                                    │
│ [Filter Tanggal ▼] [Export CSV]   │  ← Controls
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Bar Chart Container
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  marginBottom: spacing.md,
  ...shadows.sm,
}

// Bar styling
{
  fill: colors.primary, // Default bar color
  fillOpacity: 1,
  radius: [4, 4, 0, 0], // Rounded top corners
}

// Axis labels
{
  fontSize: typography.fontSize.xs, // 12px
  color: colors.textSecondary,
}

// Chart dimensions
{
  height: 240, // Mobile
  width: '100%',
  marginVertical: spacing.md,
}
```

**Library:** `react-native-chart-kit` or `victory-native`

---

### Line Chart

Line chart for showing trends over time.

```
┌────────────────────────────────────┐
│ Kehadiran Harian (30 Hari)        │
├────────────────────────────────────┤
│ 100% ┤                    ●──●──●  │
│  90% ┤          ●──●──●──●         │
│  80% ┤    ●──●──●                  │
│  70% ┤ ●──●                        │
│  60% ┤                             │
│      └──┬───┬───┬───┬───┬───┬──   │
│        1   7  14  21  28        │  ← Days
│                                    │
│ ● Rata-rata kehadiran: 87%        │  ← Summary
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Line styling
{
  stroke: colors.primary,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

// Data points
{
  fill: colors.primary,
  radius: 4,
  stroke: colors.white,
  strokeWidth: 2,
}

// Grid lines
{
  stroke: colors.gray200,
  strokeWidth: 1,
  strokeDasharray: '4, 4',
}

// Area fill (optional)
{
  fill: colors.primary,
  fillOpacity: 0.1,
}
```

---

### Pie Chart

Pie/donut chart for showing proportions.

```
┌────────────────────────────────────┐
│ Status Laporan (Bulan Ini)        │
├────────────────────────────────────┤
│                                    │
│          ┌─────────┐               │
│      ████│   142   │████           │
│    ██████│ Total   │██████         │
│  ████████│ Laporan │████████       │
│    ██████│         │██████         │
│      ████└─────────┘████           │
│                                    │
│ ██ Selesai (85) - 60%              │  ← Legend
│ ██ Proses (42) - 30%               │
│ ██ Tertunda (15) - 10%             │
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Pie slice colors
const sliceColors = {
  completed: colors.success,   // Green
  in_progress: colors.info,    // Blue
  pending: colors.warning,     // Orange
  failed: colors.error,        // Red
};

// Donut dimensions
{
  radius: 80,           // Outer radius
  innerRadius: 50,      // Inner radius (donut hole)
  padAngle: 0.02,       // Space between slices
}

// Center text
{
  fontSize: typography.fontSize['3xl'], // 30px
  fontWeight: typography.fontWeight.bold,
  color: colors.textPrimary,
  textAlign: 'center',
}

// Legend items
{
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: spacing.xs,
}

// Legend color box
{
  width: 16,
  height: 16,
  borderRadius: 4,
  marginRight: spacing.sm,
}
```

---

## Analytics Dashboard Layout

Dashboard screen showing multiple charts and KPIs.

```
┌────────────────────────────────────┐
│ ← Analitik                    [⋮] │  ← Header
├────────────────────────────────────┤
│                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐  │  ← KPI Cards (3 columns)
│ │  142   │ │   87%  │ │  3.2j  │  │
│ │Laporan │ │Hadir   │ │Rata²   │  │
│ └────────┘ └────────┘ └────────┘  │
│                                    │
│ ┌──────────────────────────────┐  │  ← Bar chart
│ │ Laporan Per Area             │  │
│ │ ██████                       │  │
│ └──────────────────────────────┘  │
│                                    │
│ ┌──────────────────────────────┐  │  ← Line chart
│ │ Trend Kehadiran              │  │
│ │ ●──●──●──●                   │  │
│ └──────────────────────────────┘  │
│                                    │
│ ┌──────────────────────────────┐  │  ← Pie chart
│ │ Status Laporan               │  │
│ │   ○○○○○                      │  │
│ └──────────────────────────────┘  │
│                                    │
│ [Filter] [Tanggal] [Export]      │  ← Controls
└────────────────────────────────────┘
```

**KPI Card Specifications:**

```typescript
// KPI Card
{
  flex: 1,
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  marginHorizontal: spacing.xs,
  alignItems: 'center',
  ...shadows.sm,
}

// KPI Value
{
  fontSize: typography.fontSize['3xl'], // 30px
  fontWeight: typography.fontWeight.bold,
  color: colors.primary,
  marginBottom: spacing.xxs,
}

// KPI Label
{
  fontSize: typography.fontSize.sm, // 14px
  color: colors.textSecondary,
  textAlign: 'center',
}

// Change indicator (optional)
{
  fontSize: typography.fontSize.xs,
  color: isPositive ? colors.success : colors.error,
  marginTop: spacing.xxs,
}
```

---

## Report Builder UI

Interface for creating custom reports.

```
┌────────────────────────────────────┐
│ ← Buat Laporan Kustom              │
├────────────────────────────────────┤
│                                    │
│ Nama Laporan                       │
│ ┌────────────────────────────────┐ │
│ │ Laporan Kehadiran Bulanan     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Rentang Waktu                      │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ 1 Jan 2026  │ │ 31 Jan 2026 │ │
│ └──────────────┘ └──────────────┘ │
│                                    │
│ Pilih Kolom                        │
│ ☑ Nama Pekerja                     │
│ ☑ Area                             │
│ ☑ Jam Masuk                        │
│ ☑ Jam Keluar                       │
│ ☐ Lokasi GPS                       │
│ ☐ Foto Selfie                      │
│                                    │
│ Filter (Opsional)                  │
│ ┌────────────────────────────────┐ │
│ │ Area: Semua                   ▼│ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Status: Hadir                 ▼│ │
│ └────────────────────────────────┘ │
│                                    │
│ Format Export                      │
│ ○ Excel (.xlsx)                    │
│ ● PDF (.pdf)                       │
│ ○ CSV (.csv)                       │
│                                    │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Preview      │ │ Generate     │ │
│ └──────────────┘ └──────────────┘ │
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Report Builder Container
{
  flex: 1,
  backgroundColor: colors.background,
  padding: spacing.md,
}

// Section Title
{
  fontSize: typography.fontSize.lg, // 18px
  fontWeight: typography.fontWeight.semibold,
  color: colors.textPrimary,
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
}

// Column Checkbox List
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  marginBottom: spacing.md,
}

// Radio Group Item
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: spacing.sm,
  minHeight: 48, // Touch target
}

// Generate Button (Primary CTA)
{
  backgroundColor: colors.primary,
  height: 52,
  borderRadius: borderRadius.md,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: spacing.lg,
}
```

---

# Phase 4: Asset Management

## QR Scanner UI

QR code scanner interface for asset identification.

```
┌────────────────────────────────────┐
│ [X]                          [⚡]  │  ← Close, Flash toggle
│                                    │
│     ┌────────────────────┐         │
│     │                    │         │
│     │   ╔════════════╗   │         │  ← Scan frame
│     │   ║            ║   │         │
│     │   ║     QR     ║   │         │
│     │   ║            ║   │         │
│     │   ╚════════════╝   │         │
│     │                    │         │
│     └────────────────────┘         │
│                                    │
│  Arahkan kamera ke QR code aset   │  ← Instructions
│                                    │
│ ┌────────────────────────────────┐ │
│ │ 📷 Ambil Foto QR Code          │ │  ← Manual entry fallback
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ⌨ Masukkan Kode Manual         │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Scanner Container
{
  flex: 1,
  backgroundColor: colors.black,
}

// Camera View
{
  flex: 1,
}

// Scan Frame Overlay
{
  position: 'absolute',
  top: '30%',
  alignSelf: 'center',
  width: 250,
  height: 250,
  borderWidth: 3,
  borderColor: colors.white,
  borderRadius: 12,
  backgroundColor: 'transparent',
}

// Corner Indicators (4 corners)
{
  position: 'absolute',
  width: 30,
  height: 30,
  borderColor: colors.primary,
  borderWidth: 4,
  // top-left: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }
  // top-right: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }
  // etc.
}

// Instruction Text
{
  position: 'absolute',
  bottom: 150,
  alignSelf: 'center',
  fontSize: typography.fontSize.base,
  color: colors.white,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: borderRadius.full,
}

// Flash Toggle Button
{
  position: 'absolute',
  top: 60,
  right: 16,
  width: 48,
  height: 48,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 24,
  justifyContent: 'center',
  alignItems: 'center',
}
```

**QR Scan Success Feedback:**

```typescript
// Success animation
const onQRScanned = (data: string) => {
  // 1. Haptic feedback
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // 2. Visual feedback (green checkmark animation)
  setShowSuccess(true);

  // 3. Navigate to asset detail
  setTimeout(() => {
    navigation.navigate('AssetDetail', { assetId: data });
  }, 500);
};
```

---

## Asset Card Design

Card displaying asset information and status.

```
┌────────────────────────────────────┐
│ [QR]                          [⋮]  │  ← QR icon + menu
├────────────────────────────────────┤
│ Mesin Potong Rumput #A-042         │  ← Asset name (xl)
│                                    │
│ 📍 Taman Bungkul - Gudang A        │  ← Location
│ 🏷 Kategori: Peralatan Taman       │  ← Category
│                                    │
│ Status Kondisi                     │
│ ┌────────────────────────────────┐ │
│ │ ● Baik                         │ │  ← Condition badge
│ └────────────────────────────────┘ │
│                                    │
│ Pemeliharaan Terakhir              │
│ 10 Jan 2026 - Servis rutin        │  ← Last maintenance
│                                    │
│ Pemeliharaan Berikutnya            │
│ ⚠ 5 hari lagi (20 Jan 2026)       │  ← Next maintenance
│                                    │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Lihat QR     │ │ Laporkan     │ │  ← Actions
│ └──────────────┘ └──────────────┘ │
└────────────────────────────────────┘
```

**Condition Status:**

| Condition | Color | Icon | Badge Text |
|-----------|-------|------|------------|
| **Excellent** | `success` | `star` | Sangat Baik |
| **Good** | `success` | `check-circle` | Baik |
| **Fair** | `warning` | `alert` | Cukup |
| **Poor** | `error` | `close-circle` | Buruk |
| **Broken** | `error` | `wrench` | Rusak |

**Specifications:**

```typescript
// Asset Card
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
  ...shadows.sm,
}

// Asset ID/Name
{
  fontSize: typography.fontSize.xl, // 20px
  fontWeight: typography.fontWeight.semibold,
  color: colors.textPrimary,
  marginBottom: spacing.sm,
}

// Condition Badge
{
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: conditionColor + '10',
  borderRadius: borderRadius.md,
  borderWidth: 1,
  borderColor: conditionColor,
}

// Maintenance Warning
{
  flexDirection: 'row',
  alignItems: 'center',
  padding: spacing.sm,
  backgroundColor: colors.warning + '10',
  borderRadius: borderRadius.sm,
  borderLeftWidth: 4,
  borderLeftColor: colors.warning,
}
```

---

## Maintenance Form UI

Form for recording asset maintenance activities.

```
┌────────────────────────────────────┐
│ ← Form Pemeliharaan                │
├────────────────────────────────────┤
│                                    │
│ Aset                               │
│ ┌────────────────────────────────┐ │
│ │ Mesin Potong Rumput #A-042    ▼│ │
│ └────────────────────────────────┘ │
│                                    │
│ Jenis Pemeliharaan                 │
│ ○ Rutin                            │
│ ● Perbaikan                        │
│ ○ Inspeksi                         │
│                                    │
│ Deskripsi Pekerjaan                │
│ ┌────────────────────────────────┐ │
│ │ Ganti oli dan bersihkan mesin │ │
│ │                                │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ Kondisi Sebelum                    │
│ ┌────────────────────────────────┐ │
│ │ Cukup                         ▼│ │
│ └────────────────────────────────┘ │
│                                    │
│ Kondisi Setelah                    │
│ ┌────────────────────────────────┐ │
│ │ Baik                          ▼│ │
│ └────────────────────────────────┘ │
│                                    │
│ Foto Dokumentasi                   │
│ ┌───────┐ ┌───────┐ ┌───────┐     │
│ │ [img] │ │ [img] │ │  [+]  │     │
│ └───────┘ └───────┘ └───────┘     │
│                                    │
│ Suku Cadang Digunakan (Opsional)  │
│ ┌────────────────────────────────┐ │
│ │ Filter oli, busi               │ │
│ └────────────────────────────────┘ │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Simpan Pemeliharaan            │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Specifications:**

```typescript
// Form Container
{
  flex: 1,
  backgroundColor: colors.background,
  padding: spacing.md,
}

// Photo Grid
{
  flexDirection: 'row',
  marginTop: spacing.sm,
  gap: spacing.sm,
}

// Photo Thumbnail
{
  width: 80,
  height: 80,
  borderRadius: borderRadius.sm,
  backgroundColor: colors.gray200,
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
}

// Add Photo Button
{
  width: 80,
  height: 80,
  borderRadius: borderRadius.sm,
  borderWidth: 2,
  borderColor: colors.border,
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.gray100,
}
```

---

# Phase 5: iOS & Advanced Features

## iOS-Specific Patterns

Guidelines for iOS platform conventions and native feel.

### SF Symbols Integration

Use SF Symbols for iOS-native iconography.

```typescript
// Conditional icon rendering
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SFSymbol from 'react-native-sfsymbols';

const CrossPlatformIcon = ({ name, size, color }) => {
  if (Platform.OS === 'ios') {
    const sfSymbolMap = {
      'clock-outline': 'clock',
      'map-marker': 'mappin',
      'account': 'person.circle',
      'camera': 'camera.fill',
      // ... mappings
    };

    return (
      <SFSymbol
        name={sfSymbolMap[name] || 'questionmark'}
        size={size}
        color={color}
        weight="regular"
      />
    );
  }

  return <Icon name={name} size={size} color={color} />;
};
```

**Common SF Symbol Mappings:**

| Function | Material Icon | SF Symbol | Weight |
|----------|---------------|-----------|--------|
| Clock-in | `login` | `arrow.forward.circle.fill` | Semibold |
| Location | `map-marker` | `mappin.circle.fill` | Regular |
| Camera | `camera` | `camera.fill` | Regular |
| Reports | `file-document` | `doc.text.fill` | Regular |
| User | `account-circle` | `person.crop.circle.fill` | Regular |
| Settings | `cog` | `gearshape.fill` | Regular |

---

### iOS Gestures

iOS-specific gesture patterns.

**Swipe to Delete (iOS List):**

```
┌────────────────────────────────────┐
│ Ahmad Rizki           [Swipe ←]    │
│ Taman Bungkul    [Delete]          │  ← Swipe reveals delete
└────────────────────────────────────┘
```

```typescript
// iOS swipeable list item
<Swipeable
  renderRightActions={() => (
    <TouchableOpacity style={styles.deleteButton}>
      <Text style={styles.deleteText}>Hapus</Text>
    </TouchableOpacity>
  )}
  onSwipeableRightOpen={handleDelete}
>
  <ListItem {...props} />
</Swipeable>
```

**iOS Context Menu (Long Press):**

```typescript
// iOS context menu
import ContextMenu from 'react-native-context-menu-view';

<ContextMenu
  actions={[
    { title: 'Edit', systemIcon: 'pencil' },
    { title: 'Duplikat', systemIcon: 'doc.on.doc' },
    { title: 'Hapus', destructive: true, systemIcon: 'trash' },
  ]}
  onPress={(e) => handleContextAction(e.nativeEvent.index)}
>
  <ListItem {...props} />
</ContextMenu>
```

---

### Apple Sign-In Button

iOS-native sign-in button following Apple HIG.

```
┌────────────────────────────────────┐
│                                    │
│ [  ] Sign in with Apple            │  ← Apple logo + text
│                                    │
└────────────────────────────────────┘
```

**Specifications:**

```typescript
import AppleAuthentication from 'expo-apple-authentication';

// Apple Sign-In Button
<AppleAuthentication.AppleAuthenticationButton
  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
  cornerRadius={8}
  style={{
    width: '100%',
    height: 48,
    marginBottom: spacing.md,
  }}
  onPress={handleAppleSignIn}
/>
```

**Button Styles:**

| Style | Background | Text | Usage |
|-------|------------|------|-------|
| **Black** | Black | White | Light backgrounds |
| **White** | White | Black | Dark backgrounds |
| **White Outline** | Transparent | Black | Light backgrounds with border |

**Requirements:**
- Minimum height: 44px
- Rounded corners: 8px (matches other buttons)
- Must be at least as prominent as other sign-in methods
- Required for apps with social login on iOS

---

### iOS Haptic Feedback

iOS-specific haptic patterns using UIImpactFeedbackGenerator.

```typescript
import * as Haptics from 'expo-haptics';

// iOS-specific haptic styles
const iOSHaptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};

// Usage in components
const handleSwipe = () => {
  if (Platform.OS === 'ios') {
    iOSHaptics.light();
  }
};
```

---

# Phase 6: Web Dashboard

## Data Table Patterns

Responsive data tables for web dashboard.

### Desktop Table Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Daftar Pekerja                                   [Filter] [⤓CSV] │
├────┬─────────────┬──────────────┬──────────┬─────────────┬───────┤
│ ☑  │ Nama        │ Area         │ Status   │ Jam Masuk   │ ⋮     │
├────┼─────────────┼──────────────┼──────────┼─────────────┼───────┤
│ ☐  │ Ahmad Rizki │ Taman Bungkul│ ● Online │ 08:05 WIB   │ ⋮     │
│ ☐  │ Budi S.     │ Taman Surya  │ ○ Offline│ -           │ ⋮     │
│ ☐  │ Citra Dewi  │ Jl. Basuki   │ ● Online │ 07:58 WIB   │ ⋮     │
│ ☐  │ Dedi P.     │ Taman Flora  │ ● Online │ 08:12 WIB   │ ⋮     │
└────┴─────────────┴──────────────┴──────────┴─────────────┴───────┘
│ 1-4 dari 142 pekerja                         ‹ 1 2 3 ... 36 › │
└──────────────────────────────────────────────────────────────────┘
```

**Specifications:**

```typescript
// Table Container (Web)
.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

// Table Header
.table-header {
  background-color: #F5F5F5;
  font-weight: 600;
  font-size: 14px;
  color: #424242;
  padding: 12px 16px;
  border-bottom: 2px solid #E0E0E0;
}

// Table Row
.table-row {
  border-bottom: 1px solid #E0E0E0;
  transition: background-color 150ms;
}

.table-row:hover {
  background-color: #FAFAFA;
  cursor: pointer;
}

// Table Cell
.table-cell {
  padding: 16px;
  font-size: 14px;
  color: #212121;
}

// Sortable Column Header
.sortable-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.sort-icon {
  margin-left: 4px;
  opacity: 0.5;
}

.sort-icon.active {
  opacity: 1;
  color: #2E7D32;
}
```

**Features:**

1. **Column Sorting:** Click header to sort ascending/descending
2. **Row Selection:** Checkbox for bulk actions
3. **Inline Actions:** Menu button (⋮) for row-specific actions
4. **Pagination:** Client-side or server-side pagination
5. **Search/Filter:** Global search + column-specific filters
6. **Export:** CSV, Excel, PDF export options
7. **Column Visibility:** Toggle columns on/off
8. **Responsive:** Transforms to cards on mobile

---

### Mobile Table → Card Transform

On screens < 768px, tables transform to cards:

```
┌────────────────────────────────────┐
│ ☐ Ahmad Rizki                      │
│ ───────────────────────────────────│
│ Area: Taman Bungkul                │
│ Status: ● Online                   │
│ Jam Masuk: 08:05 WIB               │
│                                    │
│ [Lihat Detail]               [⋮]  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ ☐ Budi Santoso                     │
│ ───────────────────────────────────│
│ Area: Taman Surya                  │
│ Status: ○ Offline                  │
│ Jam Masuk: -                       │
│                                    │
│ [Lihat Detail]               [⋮]  │
└────────────────────────────────────┘
```

**Responsive Specifications:**

```css
/* Desktop: Table */
@media (min-width: 768px) {
  .data-table {
    display: table;
  }

  .data-card {
    display: none;
  }
}

/* Mobile: Cards */
@media (max-width: 767px) {
  .data-table {
    display: none;
  }

  .data-card {
    display: block;
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}
```

---

## Bulk Action UI

Interface for performing actions on multiple selected items.

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ☑ 3 pekerja dipilih      [Aktifkan] [Nonaktifkan] [Hapus] [X]│ │  ← Bulk action bar
│ └──────────────────────────────────────────────────────────────┘ │
├────┬─────────────┬──────────────┬──────────┬─────────────┬───────┤
│ ☑  │ Nama        │ Area         │ Status   │ Jam Masuk   │ ⋮     │
├────┼─────────────┼──────────────┼──────────┼─────────────┼───────┤
│ ☑  │ Ahmad Rizki │ Taman Bungkul│ ● Online │ 08:05 WIB   │ ⋮     │  ← Selected
│ ☑  │ Budi S.     │ Taman Surya  │ ○ Offline│ -           │ ⋮     │  ← Selected
│ ☐  │ Citra Dewi  │ Jl. Basuki   │ ● Online │ 07:58 WIB   │ ⋮     │
│ ☑  │ Dedi P.     │ Taman Flora  │ ● Online │ 08:12 WIB   │ ⋮     │  ← Selected
└────┴─────────────┴──────────────┴──────────┴─────────────┴───────┘
```

**Specifications:**

```typescript
// Bulk Action Bar
.bulk-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  padding: 12px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideUp 200ms ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

// Selection Count
.selection-count {
  font-weight: 600;
  color: #2E7D32;
  margin-right: 16px;
}

// Bulk Action Buttons
.bulk-action-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms;
}

.bulk-action-btn.primary {
  background: #2E7D32;
  color: white;
}

.bulk-action-btn.danger {
  background: #F44336;
  color: white;
}

.bulk-action-btn.secondary {
  background: #E0E0E0;
  color: #424242;
}
```

**Bulk Actions:**

| Action | Icon | Confirmation Required | Description |
|--------|------|----------------------|-------------|
| **Aktifkan** | `check-circle` | No | Activate selected workers |
| **Nonaktifkan** | `cancel` | Yes | Deactivate selected workers |
| **Hapus** | `delete` | Yes | Delete selected workers |
| **Export** | `download` | No | Export selected to CSV |
| **Assign Area** | `map-marker` | No | Bulk assign area |
| **Send Notification** | `bell` | No | Send bulk notification |

**Confirmation Modal:**

```
┌────────────────────────────────────┐
│ Konfirmasi Hapus                   │
├────────────────────────────────────┤
│                                    │
│ Anda akan menghapus 3 pekerja:    │
│                                    │
│ • Ahmad Rizki                      │
│ • Budi Santoso                     │
│ • Dedi Prasetyo                    │
│                                    │
│ Tindakan ini tidak dapat dibatal.  │
│                                    │
│ ┌──────────┐      ┌──────────────┐│
│ │ Batal    │      │ Hapus (3)    ││
│ └──────────┘      └──────────────┘│
└────────────────────────────────────┘
```

---

## Web Dashboard Layout

Full web dashboard layout with sidebar navigation.

### Desktop Layout (> 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ [Logo] SEKAR          Search...        [🔔] [👤 Admin]         │ │  ← Top bar (64px)
│ └──────────────────────────────────────────────────────────────────┘ │
├─────────────────┬────────────────────────────────────────────────────┤
│ 🏠 Dashboard    │                                                    │
│ 👥 Pekerja      │  ┌───────────────────────────────────────────┐   │
│ 📋 Laporan      │  │ Page Title                      [Actions]│   │
│ 📍 Peta         │  └───────────────────────────────────────────┘   │
│ 📊 Analitik     │                                                    │
│ ⚙ Pengaturan    │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│                 │  │ Card 1  │ │ Card 2  │ │ Card 3  │           │
│ 240px sidebar   │  └─────────┘ └─────────┘ └─────────┘           │
│ (fixed)         │                                                    │
│                 │  ┌───────────────────────────────────────────┐   │
│                 │  │                                           │   │
│                 │  │         Main Content Area                 │   │
│                 │  │         (Data Table, Charts, etc.)        │   │
│                 │  │                                           │   │
│                 │  └───────────────────────────────────────────┘   │
│                 │                                                    │
└─────────────────┴────────────────────────────────────────────────────┘
```

**Specifications:**

```css
/* Layout Container */
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background-color: #F5F5F5;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #E0E0E0;
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  overflow-y: auto;
}

/* Sidebar Nav Item */
.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  color: #616161;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: #FAFAFA;
}

.nav-item.active {
  background-color: #E8F5E9;
  color: #2E7D32;
  border-left-color: #2E7D32;
}

.nav-icon {
  margin-right: 12px;
  width: 20px;
  height: 20px;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 240px;
  margin-top: 64px;
  padding: 24px;
  max-width: 1400px;
}

/* Top Bar */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  z-index: 1000;
}

/* Search Bar */
.search-bar {
  flex: 1;
  max-width: 400px;
  margin: 0 24px;
}

.search-input {
  width: 100%;
  padding: 8px 16px 8px 40px;
  border: 1px solid #E0E0E0;
  border-radius: 20px;
  font-size: 14px;
  background: url('search-icon.svg') no-repeat 12px center;
  background-size: 16px;
}

/* User Menu */
.user-menu {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.notification-badge {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background: #F44336;
  border-radius: 50%;
  border: 2px solid white;
}
```

---

## Advanced Filter UI

Comprehensive filter panel for data tables.

```
┌────────────────────────────────────┐
│ Filter                        [X]  │
├────────────────────────────────────┤
│                                    │
│ Status                             │
│ ☑ Online (42)                      │
│ ☑ Offline (15)                     │
│ ☐ Cuti (3)                         │
│                                    │
│ Area                               │
│ ┌────────────────────────────────┐ │
│ │ Pilih area...                 ▼│ │
│ └────────────────────────────────┘ │
│ ☑ Taman Bungkul (12)               │
│ ☑ Taman Surya (8)                  │
│ ☐ Jl. Basuki Rahmat (6)            │
│                                    │
│ Rentang Tanggal                    │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ 1 Jan 2026  │ │ 31 Jan 2026 │ │
│ └──────────────┘ └──────────────┘ │
│                                    │
│ Jam Masuk                          │
│ ┌────────────────────────────────┐ │
│ │ ────●──────────────○────       │ │  ← Range slider
│ └────────────────────────────────┘ │
│ 07:00 - 09:00 WIB                  │
│                                    │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Reset        │ │ Terapkan (57)│ │
│ └──────────────┘ └──────────────┘ │
└────────────────────────────────────┘
```

**Specifications:**

```css
/* Filter Panel */
.filter-panel {
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8px;
  z-index: 100;
}

/* Filter Section */
.filter-section {
  margin-bottom: 20px;
}

.filter-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 8px;
}

/* Checkbox Filter Item */
.filter-checkbox {
  display: flex;
  align-items: center;
  padding: 6px 0;
  cursor: pointer;
}

.filter-checkbox input[type="checkbox"] {
  margin-right: 8px;
  width: 18px;
  height: 18px;
}

.filter-count {
  margin-left: auto;
  font-size: 12px;
  color: #9E9E9E;
}

/* Range Slider */
.range-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #E0E0E0;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2E7D32;
  cursor: pointer;
}

.range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2E7D32;
  cursor: pointer;
  border: none;
}
```

**Filter Behavior:**

1. **Live Count:** Show matching results count as filters change
2. **Apply on Close:** Filters apply when "Terapkan" clicked
3. **Reset:** Clear all filters with one click
4. **Persist:** Save filter state in URL query params
5. **Badge:** Show active filter count on filter button

---

## Summary of UI Additions by Phase

### Phase 2: Enhanced Features
- ✅ TaskCard component (6 states, 4 priority levels)
- ✅ Notification badge (3 variants)
- ✅ FCM notification UI (4 types, in-app banner)

### Phase 3: Analytics & Reporting
- ✅ Bar chart component
- ✅ Line chart component
- ✅ Pie/donut chart component
- ✅ Analytics dashboard layout
- ✅ KPI card component
- ✅ Report builder UI

### Phase 4: Asset Management
- ✅ QR scanner UI (with manual fallback)
- ✅ Asset card (5 condition states)
- ✅ Maintenance form UI

### Phase 5: iOS & Advanced
- ✅ SF Symbols integration
- ✅ iOS gesture patterns (swipe, context menu)
- ✅ Apple Sign-In button
- ✅ iOS haptic feedback patterns

### Phase 6: Web Dashboard
- ✅ Data table patterns (desktop + mobile responsive)
- ✅ Bulk action UI (6 actions)
- ✅ Web dashboard layout (sidebar, top bar)
- ✅ Advanced filter UI (5 filter types)

---

## Accessibility Compliance

All Phase 2-6 components maintain WCAG 2.1 AA compliance:

### Required for All Components

- **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
- **Touch Targets:** Minimum 48×48px (mobile), 44×44px (web)
- **Keyboard Navigation:** All interactive elements accessible via Tab/Arrow keys
- **Screen Reader Support:** Proper `accessibilityLabel` and `accessibilityRole`
- **Focus Indicators:** Visible focus states for all interactive elements
- **Alternative Text:** All icons paired with text or have `accessibilityLabel`

### Component-Specific Requirements

**TaskCard:**
- Announce priority, status, and deadline to screen readers
- Status badge uses color + icon + text (not color alone)

**Charts:**
- Provide data table alternative for screen readers
- Use patterns/textures in addition to colors
- Include text summary of key insights

**QR Scanner:**
- Manual entry fallback for accessibility
- Voice guidance during scan process
- Haptic feedback on successful scan

**Data Tables:**
- Sortable headers announced to screen readers
- Row selection state communicated clearly
- Keyboard navigation: Arrow keys for cells, Space for checkbox

**Filter Panel:**
- All filters keyboard-accessible
- Active filter count announced
- Clear focus indicators on all controls

---

## Implementation Priority

Recommended implementation order within each phase:

### Phase 2
1. TaskCard component (core feature)
2. Notification badge (navigation enhancement)
3. FCM notification UI (engagement feature)

### Phase 3
1. KPI card component (simple, high value)
2. Bar chart (most common chart type)
3. Line chart (trend analysis)
4. Pie chart (proportions)
5. Report builder UI (advanced feature)

### Phase 4
1. Asset card (core display)
2. QR scanner UI (identification)
3. Maintenance form UI (data entry)

### Phase 5
1. iOS haptic feedback (quick win, polish)
2. SF Symbols integration (native feel)
3. Apple Sign-In button (auth enhancement)
4. iOS gestures (advanced UX)

### Phase 6
1. Data table patterns (foundation)
2. Web dashboard layout (structure)
3. Bulk action UI (productivity)
4. Advanced filter UI (power user feature)

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-21
**Status:** Specification Complete - Awaiting Implementation
**Related Documents:**
- [Component Library](./components.md) - Phase 1 MVP components
- [Design System](./design-system.md) - Foundation tokens
- [Accessibility Guidelines](./accessibility.md) - WCAG compliance
- [Color Palette](./color-palette.md) - Color specifications
- [Typography](./typography.md) - Text patterns
