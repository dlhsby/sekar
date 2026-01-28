# Neo Brutalism Migration Guide

**Date:** January 28, 2026
**Target:** SEKAR Mobile App Developers
**Status:** Material Design → Neo Brutalism Migration Complete

---

## Overview

This guide helps developers migrate from the deprecated Material Design components to the new Neo Brutalism (NB) design system components.

**Why Migrate?**
- Consistent, bold, and distinctive UI across the entire app
- Better accessibility with motion preferences support
- Higher performance with optimized components
- Future-proof: Material Design components will be removed in next major release

---

## Quick Reference

### Component Mapping Table

| Material Design (Old) | Neo Brutalism (New) | Status |
|----------------------|---------------------|--------|
| `EmptyState` | `NBEmptyState` | ⚠️ Deprecated |
| `ErrorBanner` | `NBAlert` | ⚠️ Deprecated |
| `SkeletonLoader` | `NBSkeleton` | ⚠️ Deprecated |
| `Button` | `NBButton` | ✅ Use NB only |
| `Card` | `NBCard` | ✅ Use NB only |
| `TextInput` | `NBTextInput` | ✅ Use NB only |
| `Badge` | `NBBadge` | ✅ Use NB only |

---

## Import Changes

### Before (Material Design)

```typescript
import {
  EmptyState,
  ErrorBanner,
  SkeletonLoader,
  Button,
  Card,
  TextInput
} from '../../components/common';
```

### After (Neo Brutalism)

```typescript
import {
  NBEmptyState,
  NBAlert,
  NBSkeleton,
  NBButton,
  NBCard,
  NBTextInput,
  NBBadge,
  NBTab
} from '../../components/nb';
```

---

## Component-by-Component Migration

## 1. EmptyState → NBEmptyState

### Prop Changes

| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `variant` | `variant` | Values changed (see table below) |
| `title` | `title` | Same |
| `description` | `description` | Same |
| `icon` | `icon` | Same |
| `ctaLabel` | `ctaLabel` | Same |
| `onCtaPress` | `onCTA` | **Renamed** |
| `style` | `style` | Same |

### Variant Mapping

| Old Variant | New Variant | Notes |
|-------------|-------------|-------|
| `'reports'` | `'noData'` | Generic no data state |
| `'shifts'` | `'noData'` | Generic no data state |
| `'workers'` | `'noData'` | Generic no data state |
| `'locations'` | `'offline'` | Location-specific |
| `'notifications'` | `'complete'` | All caught up |
| `'search'` | `'noResults'` | Search results empty |
| `'error'` | `'error'` | Same |
| `'offline'` | `'offline'` | Same |
| `'generic'` | `'noData'` | Same |

### Before

```typescript
<EmptyState
  variant="reports"
  title="Belum Ada Laporan"
  description="Belum ada laporan kerja yang dibuat"
  ctaLabel="Buat Laporan"
  onCtaPress={handleCreateReport}
  icon="file-document-outline"
/>
```

### After

```typescript
<NBEmptyState
  variant="noData"
  title="Belum Ada Laporan"
  description="Belum ada laporan kerja yang dibuat"
  ctaLabel="Buat Laporan"
  onCTA={handleCreateReport} // ← Changed from onCtaPress
  icon="file-document-outline"
/>
```

### Default Text by Variant

NBEmptyState provides default Indonesian text for each variant:

```typescript
// 'noData' variant
title: "Belum Ada Data"
description: "Data akan muncul di sini setelah tersedia"

// 'noResults' variant
title: "Tidak Ditemukan"
description: "Tidak ada hasil yang cocok dengan pencarian Anda"

// 'offline' variant
title: "Tidak Ada Koneksi"
description: "Anda sedang offline. Data akan dimuat otomatis saat koneksi tersedia"

// 'error' variant
title: "Terjadi Kesalahan"
description: "Gagal memuat data. Silakan coba lagi"

// 'maintenance' variant
title: "Dalam Pemeliharaan"
description: "Sistem sedang dalam pemeliharaan. Coba lagi nanti"

// 'permission' variant
title: "Izin Diperlukan"
description: "Aplikasi memerlukan izin untuk mengakses fitur ini"

// 'empty' variant
title: "Kosong"
description: "Tidak ada item untuk ditampilkan"

// 'complete' variant
title: "Semua Selesai"
description: "Tidak ada tugas yang tertunda"

// 'search' variant
title: "Mulai Pencarian"
description: "Gunakan kotak pencarian di atas untuk menemukan data"
```

You can override these defaults by providing custom `title` and `description` props.

---

## 2. ErrorBanner → NBAlert

### Prop Changes

| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `message` | `message` | Same |
| `variant` | `variant` | Values changed (see table below) |
| `onDismiss` | `onDismiss` | Same |
| `actionText` | `actionLabel` | **Renamed** |
| `onAction` | `onAction` | Same |
| `style` | `style` | Same |
| — | `title` | **New** (optional) |
| — | `icon` | **New** (optional) |
| — | `dismissible` | **New** (boolean flag) |

### Variant Mapping

| Old Variant | New Variant | Notes |
|-------------|-------------|-------|
| `'error'` | `'danger'` | Red background, error icon |
| `'warning'` | `'warning'` | Orange background, warning icon |
| `'info'` | `'info'` | Blue background, info icon |
| — | `'success'` | **New** - Green background, check icon |

### Before

```typescript
<ErrorBanner
  message="Gagal memuat data"
  variant="error"
  onDismiss={() => setError('')}
/>

// or with action button
<ErrorBanner
  message="Gagal memuat data"
  variant="error"
  actionText="Coba Lagi"
  onAction={handleRetry}
/>
```

### After

```typescript
<NBAlert
  message="Gagal memuat data"
  variant="danger" // ← Changed from 'error'
  dismissible // ← New boolean flag
  onDismiss={() => setError('')}
/>

// or with action button
<NBAlert
  message="Gagal memuat data"
  variant="danger" // ← Changed from 'error'
  actionLabel="Coba Lagi" // ← Changed from actionText
  onAction={handleRetry}
/>

// With optional title
<NBAlert
  variant="danger"
  title="Gagal Memuat Laporan" // ← New prop
  message="Terjadi kesalahan saat memuat data laporan"
  actionLabel="Coba Lagi"
  onAction={handleRetry}
/>
```

### New Features

**Title Support:**
```typescript
<NBAlert
  variant="success"
  title="Berhasil" // ← Optional title
  message="Data berhasil disimpan"
  dismissible
  onDismiss={handleClose}
/>
```

**Custom Icons:**
```typescript
<NBAlert
  variant="info"
  icon="information-outline" // ← Custom icon
  message="Versi baru tersedia"
  actionLabel="Update"
  onAction={handleUpdate}
/>
```

**Haptic Feedback:**
NBAlert automatically provides haptic feedback on:
- Dismiss button press
- Action button press

---

## 3. SkeletonLoader → NBSkeleton

### Prop Changes

| Old Prop | New Prop | Notes |
|----------|----------|-------|
| ~~`type`~~ | `variant` | **Renamed** |
| `count` | `count` | Same |
| `width` | `width` | Same |
| `height` | `height` | Same |

### Variant Mapping

| Old Type | New Variant | Notes |
|----------|-------------|-------|
| ~~Not used~~ | `'text'` | Single line skeleton |
| ~~Not used~~ | `'card'` | Card-shaped skeleton |
| ~~Not used~~ | `'avatar'` | Circular avatar |
| ~~Not used~~ | `'list'` | Multiple list items |
| ~~Not used~~ | `'button'` | Button-shaped skeleton |

### Before

```typescript
// Old SkeletonLoader usage
<SkeletonLoader width="100%" height={20} />

// Multiple items (using SkeletonList)
<SkeletonList count={5} />

// Card skeleton (using SkeletonCard)
<SkeletonCard />
```

### After

```typescript
// Text skeleton
<NBSkeleton variant="text" width="100%" height={20} />

// List skeleton (multiple items)
<NBSkeleton variant="list" count={5} />

// Card skeleton
<NBSkeleton variant="card" width="100%" height={200} />

// Avatar skeleton
<NBSkeleton variant="avatar" width={48} height={48} />

// Button skeleton
<NBSkeleton variant="button" width={120} height={48} />
```

### New Features

**Sharp Borders:**
NBSkeleton adds bold 2px black borders to all skeleton boxes for Neo Brutalism aesthetic.

**Shimmer Animation:**
Preserved from SkeletonLoader, optimized for hard-edge rectangles.

---

## 4. Existing NB Components (Already Migrated)

These components are already fully migrated to Neo Brutalism. No action needed.

### NBButton

```typescript
<NBButton
  title="Submit"
  onPress={handleSubmit}
  variant="primary" // primary, secondary, danger, outline, ghost
  size="md" // sm, md, lg
  fullWidth={false}
  disabled={false}
  loading={false}
/>
```

**Features:**
- 5 variants with distinct styles
- 3 sizes (sm, md, lg)
- Loading state with spinner
- Haptic feedback
- Hard-edge shadow with press animation
- Motion preference support

### NBCard

```typescript
<NBCard
  variant="default" // default, elevated
  onPress={handlePress} // optional - makes card interactive
>
  <Text>Card content</Text>
</NBCard>
```

**Features:**
- 2 variants (default with sm shadow, elevated with lg shadow)
- Optional press interaction
- Hard-edge shadow with press animation
- Motion preference support

### NBTextInput

```typescript
<NBTextInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  error={emailError}
  success={emailSuccess}
  helperText="We'll never share your email"
  disabled={false}
  secureTextEntry={false}
/>
```

**Features:**
- Label support
- Error and success states with colored borders
- Helper text
- Secure text entry (password fields)
- Accessibility labels
- 48px minimum height (touch target)

### NBBadge

```typescript
<NBBadge
  variant="primary" // primary, success, warning, danger, info, neutral
  size="md" // sm, md, lg
  text="New"
  icon="star" // optional
/>
```

**Features:**
- 6 variants with distinct colors
- 3 sizes
- Optional icon support
- Sharp corners (borderRadius: 0)

### NBTab

```typescript
<NBTab
  tabs={[
    { id: 'tasks', label: 'Tugas', badge: 5 },
    { id: 'reports', label: 'Laporan' }
  ]}
  activeTab="tasks"
  onTabPress={setActiveTab}
/>
```

**Features:**
- Multiple tabs with labels
- Optional badge counts
- Active state with bold border
- Press animation
- Motion preference support

---

## Migration Checklist

### For Each Screen/Component

- [ ] Identify all Material Design component usage
- [ ] Update imports from `components/common` to `components/nb`
- [ ] Rename props:
  - [ ] `onCtaPress` → `onCTA` (NBEmptyState)
  - [ ] `actionText` → `actionLabel` (NBAlert)
  - [ ] `type` → `variant` (NBSkeleton)
- [ ] Update variant values:
  - [ ] ErrorBanner `'error'` → NBAlert `'danger'`
  - [ ] EmptyState variants → NBEmptyState standardized variants
- [ ] Update tests:
  - [ ] Check for hardcoded text expectations
  - [ ] Use new default text or custom props
  - [ ] Update snapshot tests if needed
- [ ] Test manually:
  - [ ] Visual appearance (bold borders, hard shadows)
  - [ ] Press animations work
  - [ ] Accessibility (screen reader, touch targets)
  - [ ] "Reduce Motion" setting respected

---

## Common Patterns

### Loading State

**Before:**
```typescript
{loading && <SkeletonLoader />}
{!loading && data && <DataList data={data} />}
{!loading && !data && <EmptyState variant="generic" />}
```

**After:**
```typescript
{loading && <NBSkeleton variant="list" count={5} />}
{!loading && data && <DataList data={data} />}
{!loading && !data && <NBEmptyState variant="noData" />}
```

### Error State

**Before:**
```typescript
{error && (
  <ErrorBanner
    message={error}
    variant="error"
    actionText="Retry"
    onAction={handleRetry}
  />
)}
```

**After:**
```typescript
{error && (
  <NBAlert
    message={error}
    variant="danger"
    actionLabel="Coba Lagi"
    onAction={handleRetry}
  />
)}
```

### Empty State with CTA

**Before:**
```typescript
<EmptyState
  variant="reports"
  title="No Reports"
  description="Start creating reports"
  ctaLabel="Create Report"
  onCtaPress={handleCreate}
/>
```

**After:**
```typescript
<NBEmptyState
  variant="noData"
  title="Belum Ada Laporan"
  description="Mulai buat laporan kerja Anda"
  ctaLabel="Buat Laporan"
  onCTA={handleCreate}
/>
```

---

## Testing After Migration

### Unit Tests

Update test expectations to match new component text:

```typescript
// Before
expect(getByText('Belum Ada Shift')).toBeTruthy();

// After (using NBEmptyState default text)
expect(getByText('Belum Ada Riwayat Shift')).toBeTruthy();
```

Or provide custom text:

```typescript
<NBEmptyState
  variant="noData"
  title="Belum Ada Shift" // Custom text
  description="Custom description"
/>
```

### Snapshot Tests

Update snapshots after migration:

```bash
npm test -- --updateSnapshot
```

### Manual Testing

1. **Visual Review:**
   - Verify bold borders (2-4px black)
   - Verify hard-edge shadows (no blur)
   - Verify sharp corners (borderRadius: 0)

2. **Interactions:**
   - Test button press animations
   - Test card press animations
   - Test haptic feedback

3. **Accessibility:**
   - Enable "Reduce Motion" in device settings
   - Verify animations disabled
   - Test with screen reader (TalkBack/VoiceOver)
   - Verify touch targets ≥48x48px

---

## Troubleshooting

### Issue: Tests failing after migration

**Symptom:** Tests looking for old component text fail

**Solution:** Update test expectations to match new NBEmptyState/NBAlert default text, or provide custom text props

```typescript
// Option 1: Update test
expect(getByText('Belum Ada Riwayat Shift')).toBeTruthy();

// Option 2: Use custom text
<NBEmptyState
  variant="noData"
  title="Belum Ada Shift"
  description="Custom text"
/>
```

### Issue: Import errors

**Symptom:** `Module not found: Can't resolve 'components/nb'`

**Solution:** Ensure correct import path from your file location

```typescript
// From screens/worker/
import { NBButton } from '../../components/nb';

// From components/common/
import { NBButton } from '../nb';
```

### Issue: Prop type errors

**Symptom:** TypeScript error about prop name

**Solution:** Check prop name changes (onCtaPress → onCTA, actionText → actionLabel, type → variant)

### Issue: Missing haptic feedback

**Symptom:** No vibration on button press

**Solution:** Ensure `react-native-haptic-feedback` is installed and linked

```bash
npm install react-native-haptic-feedback
cd ios && pod install
```

---

## Timeline

### Phase 1-5 Complete (January 28, 2026)

- ✅ All Material Design components deprecated
- ✅ All screens migrated to Neo Brutalism
- ✅ 8 NB components production-ready
- ✅ 191 NB component tests passing
- ✅ 100% specification compliance

### Next Steps (Optional)

**When ready to remove deprecated components:**

1. Ensure all code uses NB components
2. Run full test suite
3. Delete deprecated files:
   ```bash
   rm src/components/common/EmptyState.tsx
   rm src/components/common/ErrorBanner.tsx
   rm src/components/common/SkeletonLoader.tsx
   ```
4. Update `components/common/index.ts` to remove exports

---

## Resources

- **Neo Brutalism Compliance Report:** `NB_COMPLIANCE_REPORT.md`
- **Design Tokens:** `src/constants/nbTokens.ts`
- **Shadow Utility:** `src/constants/nbShadow.ts`
- **Component Tests:** `src/components/nb/__tests__/`
- **Specification:** See plan document for full NB guidelines

---

## Support

If you encounter issues during migration:

1. Check this migration guide
2. Review component tests for usage examples
3. Check NB_COMPLIANCE_REPORT.md for detailed specifications
4. Consult design tokens in `src/constants/nbTokens.ts`

---

*Last Updated: January 28, 2026*
*Migration Guide Version: 1.0*
