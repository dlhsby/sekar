# Instructions to Fix GPS Coordinates Error

The code has been fixed, but you **MUST** reload the app to apply the changes.

## REQUIRED: Clear Metro Cache and Restart

React Native is still running the old cached code. You MUST clear the cache:

```bash
cd fe/mobile

# Stop Metro bundler (Ctrl+C if it's running)

# Clear Metro cache and restart
npm start -- --reset-cache

# In another terminal, rebuild and run:
npm run android
# or
npm run ios
```

## If That Doesn't Work: Full Clean Restart

```bash
cd fe/mobile

# Stop Metro bundler (Ctrl+C)

# Clear all caches
rm -rf node_modules/.cache
rm -rf android/app/build  # Android only
watchman watch-del-all    # If you have watchman installed (optional)

# Restart Metro
npm start -- --reset-cache

# In another terminal:
npm run android
# or
npm run ios
```

## What Was Fixed

The error occurred because:
1. The API returns `null` for GPS coordinates when a report doesn't have location data
2. The TypeScript type incorrectly defined `gps_lat` and `gps_lng` as `number` instead of `number | null`
3. The UI code tried to call `.toFixed()` on `null` values, causing the crash

**Files Changed:**

1. **`src/types/models.types.ts`**
   - Fixed `WorkReport` interface: `gps_lat` and `gps_lng` are now `number | null`
   - This matches the backend schema where GPS coordinates can be null

2. **`src/screens/supervisor/ReportDetailScreen.tsx`**
   - Added null checks before calling `.toFixed(6)` on GPS coordinates
   - Conditionally renders GPS display:
     - **With GPS:** Shows coordinates + "Buka di Peta" button
     - **Without GPS:** Shows "📍 Data lokasi GPS tidak tersedia"
   - Updated `handleOpenMaps` to check for null GPS before opening maps

3. **`src/screens/supervisor/__tests__/ReportDetailScreen.test.tsx`**
   - Added 3 test cases for null GPS coordinates scenarios
   - All 29 tests passing

## After Reloading

✅ Reports with GPS coordinates will display them with "Buka di Peta" button
✅ Reports without GPS will show "Data lokasi GPS tidak tersedia"
✅ No more crashes when viewing report details
