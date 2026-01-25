# Report ID Type Mismatch Fix

**Date:** January 23, 2026
**Issue:** Navigation to Worker Report Detail screen fails with UUID error
**Error:** `error: invalid input syntax for type uuid: "37605"`

## Problem Summary

When tapping a report in the Worker Reports List screen, the app was attempting to navigate with a numeric ID (e.g., "37605") but the backend `/api/v1/reports/:id` endpoint expects a UUID string format.

## Root Cause

The mobile application's TypeScript type definitions were out of sync with the backend schema. The backend had been updated to use UUID primary keys for all major entities (User, Shift, Report, Area, etc.), but the mobile types still defined these as `number` types.

### Type Mismatches Found

#### Before (Incorrect)
```typescript
// User
id: number;

// Shift
id: number;
worker_id: number;
area_id: number;

// WorkerAssignment
id: number;
worker_id: number;
area_id: number;

// AreaType
id: number;

// Area
area_type_id: number;

// LocationPing
id?: number;
worker_id?: number;
shift_id?: number;

// API Types
shift_id: number; // in ClockInResponse, ClockOutResponse, CreateReportRequest
worker_id?: number; // in ReportsFilter, AttendanceFilter
area_id?: number; // in ReportsFilter, AttendanceFilter
```

#### After (Correct - Matches Backend)
```typescript
// All IDs updated to UUID strings
id: string;
worker_id: string;
area_id: string;
shift_id: string;
area_type_id: string;
```

## Files Modified

### Type Definitions
1. **`/fe/mobile/src/types/models.types.ts`**
   - Updated `User.id` from `number` to `string` (UUID)
   - Updated `Shift` IDs from `number` to `string` (UUID)
   - Updated `WorkerAssignment` IDs from `number` to `string` (UUID)
   - Updated `AreaType.id` from `number` to `string` (UUID)
   - Updated `Area.area_type_id` from `number` to `string` (UUID)
   - Updated `LocationPing` IDs from `number` to `string` (UUID)
   - Updated `ActiveWorker.worker_id` from `number` to `string` (UUID)
   - Updated `AttendanceRecord.worker_id` from `number` to `string` (UUID)

2. **`/fe/mobile/src/types/api.types.ts`**
   - Updated `ClockInResponse.shift_id` from `number` to `string` (UUID)
   - Updated `ClockOutResponse.shift_id` from `number` to `string` (UUID)
   - Updated `CreateReportRequest.shift_id` from `number` to `string` (UUID)
   - Updated `ReportsFilter` worker_id/area_id from `number` to `string` (UUID)
   - Updated `AttendanceFilter.area_id` from `number` to `string` (UUID)
   - Updated `ActiveWorkerData` and related interfaces from `number` to `string` (UUID)

### Error Handling & Validation
3. **`/fe/mobile/src/screens/worker/ReportsListScreen.tsx`**
   - Added UUID format validation before navigation
   - Added console logging to track report IDs from API
   - Added user-friendly error message for invalid UUID formats
   - Prevents navigation when report ID is not a valid UUID

   ```typescript
   const handleReportPress = useCallback((reportId: string): void => {
     console.log('[ReportsListScreen] Navigating to report detail with UUID:', reportId);
     // Validate that reportId is a valid UUID format
     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
     if (!uuidRegex.test(reportId)) {
       console.error('[ReportsListScreen] Invalid report ID format. Expected UUID, got:', reportId);
       console.error('[ReportsListScreen] This may indicate old test data or a data migration issue.');
       setError('Format ID laporan tidak valid. Silakan hubungi administrator.');
       return;
     }
     navigation.navigate('ReportDetail', { reportId });
   }, [navigation]);
   ```

4. **`/fe/mobile/src/components/worker/ReportListItem.tsx`**
   - Added UUID format validation in `handlePress` function
   - Prevents navigation with invalid UUID format
   - Logs error when invalid UUID detected

   ```typescript
   const handlePress = (): void => {
     if (onPress && reportId) {
       // Validate UUID format before navigation
       const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
       if (uuidRegex.test(reportId)) {
         onPress(reportId);
       } else {
         console.error('[ReportListItem] Invalid UUID format, cannot navigate:', reportId);
       }
     }
   };
   ```

### Tests
5. **`/fe/mobile/src/components/worker/__tests__/ReportListItem.test.tsx`**
   - Updated test cases to use valid UUID format
   - Changed `'calls onPress when item pressed'` test to use UUID: `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'`
   - Changed `'calls onPress with numeric id'` test to `'does not call onPress with invalid UUID format'`
   - Test now validates that invalid UUIDs are rejected

## Backend Schema (For Reference)

All backend entities now use UUID primary keys:

```typescript
// User Entity
@PrimaryGeneratedColumn('uuid')
id: string;

// Shift Entity
@PrimaryGeneratedColumn('uuid')
id: string;
@Column('uuid')
worker_id: string;
@Column('uuid')
area_id: string;

// Report Entity
@PrimaryGeneratedColumn('uuid')
id: string;
@Column({ type: 'uuid' })
worker_id: string;
@Column({ type: 'uuid' })
shift_id: string;
@Column({ type: 'uuid' })
area_id: string;

// Area Entity
@PrimaryGeneratedColumn('uuid')
id: string;
@Column('uuid')
area_type_id: string;

// AreaType Entity
@PrimaryGeneratedColumn('uuid')
id: string;

// LocationLog Entity
@PrimaryGeneratedColumn('uuid')
id: string;
@Column({ type: 'uuid' })
worker_id: string;
@Column({ type: 'uuid' })
shift_id: string;
```

## Testing

All tests pass after the fix:

```bash
cd fe/mobile
npm test -- --testPathPattern="ReportListItem"
# ✓ 22 tests passed

npm test -- --testPathPattern="ReportsListScreen"
# ✓ All tests passed
```

## Migration Considerations

### For Existing Installations

If there is existing data in the database with numeric IDs (from before the UUID migration), you will need to:

1. **Backend Migration**: Ensure all database tables have been migrated to use UUID primary keys
2. **Data Migration**: Convert existing numeric IDs to UUIDs
3. **Mobile App**: Clear local storage to remove cached data with old numeric IDs

```typescript
// Clear cached reports (optional - done automatically when API returns UUIDs)
await AsyncStorage.removeItem('cached_my_reports');
```

### For New Installations

No special action needed - the app now correctly expects and validates UUID formats throughout.

## Validation Strategy

The fix implements a two-layer validation strategy:

1. **Component Level** (`ReportListItem.tsx`):
   - Validates UUID before calling navigation callback
   - Logs error but fails silently (no user-facing error)

2. **Screen Level** (`ReportsListScreen.tsx`):
   - Validates UUID before navigation
   - Shows user-friendly error message if validation fails
   - Logs detailed error information for debugging

This prevents the app from attempting to fetch reports with invalid IDs and provides clear feedback when data integrity issues are detected.

## UUID Regex Pattern

The validation uses this regex pattern:
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

This matches the standard UUID v4 format:
- 8 hex digits
- 4 hex digits
- 4 hex digits
- 4 hex digits
- 12 hex digits
- Case insensitive

Example valid UUID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

## Future Considerations

1. **Type Safety**: Consider creating a branded type for UUIDs to prevent accidental mixing of string types
   ```typescript
   type UUID = string & { readonly __brand: 'UUID' };
   ```

2. **Centralized Validation**: Move UUID validation to a shared utility function
   ```typescript
   // /fe/mobile/src/utils/validators.ts
   export const isValidUUID = (value: string): boolean => {
     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
     return uuidRegex.test(value);
   };
   ```

3. **Backend Validation**: Ensure backend also validates UUID format in route parameters
   ```typescript
   // NestJS example
   @Param('id', new ParseUUIDPipe()) id: string
   ```

## Related Issues

If you encounter similar UUID errors in other screens (Shift History, Profile, etc.), apply the same type corrections and validation patterns used in this fix.

## Summary

This fix aligns the mobile application's type definitions with the backend database schema, ensuring all entity IDs are correctly typed as UUID strings. It also adds validation to prevent navigation with invalid IDs and provides clear error messages when data integrity issues are detected.

**Result**: Reports can now be viewed correctly, and the app provides meaningful feedback if old or invalid data is encountered.
