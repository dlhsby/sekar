# Phase 6 - Mobile Implementation Checklist

**Duration:** 3 days (maintenance and sync)
**Prerequisites:** Phase 5 mobile deployed

---

## Overview

Phase 6 is primarily a web dashboard phase. Mobile work consists of maintenance updates, settings sync, and ensuring compatibility with new backend features.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Settings Sync | System settings integration |
| Day 2 | Notifications | Scheduled report notifications |
| Day 3 | Testing | Compatibility testing |

---

## Updates Required

### 1. System Settings Sync

The web dashboard will allow admins to configure system settings that affect mobile behavior.

**Settings to Sync:**
- GPS validation radius
- Attendance grace period
- Maximum shift duration
- Photo limits per report

```typescript
// src/services/api/settingsApi.ts
export const settingsApi = {
  getSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },
};

// src/hooks/useSystemSettings.ts
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getSettings();
      setSettings(data);
      // Cache locally
      await AsyncStorage.setItem('system_settings', JSON.stringify(data));
    } catch {
      // Use cached settings if offline
      const cached = await AsyncStorage.getItem('system_settings');
      if (cached) setSettings(JSON.parse(cached));
    }
  };

  return { settings, refresh: loadSettings };
}
```

### 2. Apply Settings to Features

```typescript
// Update GPS validation to use dynamic radius
const validateLocation = (position: Position) => {
  const { settings } = useSystemSettings();
  const radius = settings?.gps_validation_radius_meters || 100;

  const distance = calculateDistance(
    position.latitude,
    position.longitude,
    area.centerLat,
    area.centerLng
  );

  return distance <= radius;
};

// Update report photo limit
const MAX_PHOTOS = settings?.report_photo_max_count || 5;

// Update shift duration validation
const MAX_SHIFT_HOURS = settings?.shift_max_duration_hours || 12;
```

### 3. Notification Updates

Handle notifications for scheduled reports (supervisors).

```typescript
// src/services/notifications/handlers.ts
export const handleNotification = (notification: RemoteMessage) => {
  const { type, data } = notification.data;

  switch (type) {
    case 'scheduled_report':
      // Show notification that scheduled report is ready
      showLocalNotification({
        title: 'Laporan Tersedia',
        body: `Laporan "${data.reportName}" telah dikirim ke email Anda.`,
      });
      break;
    // ... existing handlers
  }
};
```

---

## Implementation Checklist

### Day 1: Settings Sync

- [ ] Add settingsApi service
- [ ] useSystemSettings hook
- [ ] Cache settings locally
- [ ] Apply GPS radius from settings
- [ ] Apply photo limit from settings
- [ ] Apply shift duration from settings
- [ ] Apply grace period from settings

### Day 2: Notifications

- [ ] Handle scheduled_report notification type
- [ ] Show local notification for report availability
- [ ] Deep link to email (optional)
- [ ] Test notification handling

### Day 3: Compatibility Testing

- [ ] Test with new backend endpoints
- [ ] Test settings sync
- [ ] Test offline behavior
- [ ] Test notification types
- [ ] Regression testing
- [ ] Build APK for testing

---

## Settings Interface

```typescript
// src/types/settings.ts
export interface SystemSettings {
  attendance_grace_period_minutes: number;
  gps_validation_radius_meters: number;
  report_photo_max_count: number;
  shift_max_duration_hours: number;
  notification_email: string;
}
```

---

## Success Criteria

1. Mobile respects system settings from backend
2. Settings cached for offline use
3. Notification for scheduled reports works
4. No regressions from Phase 5

---

**Last Updated:** 2026-01-16
