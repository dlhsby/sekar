# Phase 6 - Full Web Dashboard

## 🎯 Objectives

Build the complete web dashboard with all management and analytics features.

**Duration:** 10 days  
**Prerequisites:** Phases 1-5 complete, Phase 2 web foundation

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1 | Layout & Navigation | Complete navigation, layout polish |
| Day 2 | Dashboard | Analytics charts, real-time stats |
| Day 3 | Live Map | Worker tracking, area polygons |
| Day 4-5 | Reports | Full CRUD, review workflow, filters |
| Day 6 | Attendance | List, export, statistics |
| Day 7 | Management | Workers, areas, KMZ import |
| Day 8-9 | Analytics | Advanced charts, report builder |
| Day 10 | Testing & Polish | E2E tests, bug fixes |

---

## 📱 All Pages

### 1. Dashboard Home
- Summary statistics cards
- Attendance chart (weekly)
- Reports by condition (pie chart)
- Recent reports list
- Active workers count
- Pending tasks alert

### 2. Live Map
- Full-screen map view
- Worker markers with info popups
- Area boundaries (polygons)
- Area filtering
- Worker list sidebar
- Real-time location updates (polling)

### 3. Reports Management
- Searchable, filterable table
- Date range picker
- Area/worker filters
- Report detail modal
- Media gallery (photos/videos)
- Review action with notes
- Bulk review option
- Export to CSV

### 4. Attendance
- Daily attendance table
- Clock-in/out times
- Hours worked calculation
- Late arrivals highlight
- Export functionality
- Monthly overview

### 5. Worker Management
- Worker list with search
- Add/edit worker form
- Role assignment
- Area assignment
- Activation/deactivation
- Performance summary

### 6. Area Management
- Areas table
- Add/edit area form
- Map picker for GPS
- KMZ file import
- Polygon boundary support
- Worker assignment view

### 7. Analytics
- Worker performance charts
- Area coverage trends
- Operational metrics
- Date range selection
- Comparative analysis
- Export reports

### 8. Report Builder
- Custom report configuration
- Select metrics/fields
- Schedule automated reports
- Email delivery setup
- Download history

### 9. Settings
- Profile settings
- Notification preferences
- System configuration (admin)

---

## 🗺️ Live Map Implementation

### Google Maps Setup

```typescript
// src/components/map/LiveMap.tsx
import { GoogleMap, useJsApiLoader, Marker, Polygon, InfoWindow } from '@react-google-maps/api';
import { useState, useCallback } from 'react';
import { useActiveWorkers } from '@/hooks/useActiveWorkers';
import { useAreas } from '@/hooks/useAreas';

export const LiveMap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const { data: workers } = useActiveWorkers({ refetchInterval: 30000 });
  const { data: areas } = useAreas();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const center = { lat: -7.2756, lng: 112.6426 }; // Surabaya

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap
      mapContainerClassName="w-full h-[calc(100vh-200px)]"
      center={center}
      zoom={12}
    >
      {/* Area boundaries */}
      {areas?.map((area) => (
        area.boundary_polygon && (
          <Polygon
            key={area.id}
            paths={area.boundary_polygon.coordinates}
            options={{
              fillColor: '#22c55e',
              fillOpacity: 0.2,
              strokeColor: '#16a34a',
              strokeWeight: 2,
            }}
          />
        )
      ))}

      {/* Worker markers */}
      {workers?.map((worker) => (
        <Marker
          key={worker.id}
          position={{ lat: worker.current_gps_lat, lng: worker.current_gps_lng }}
          icon={{
            url: '/markers/worker-active.png',
            scaledSize: new google.maps.Size(32, 32),
          }}
          onClick={() => setSelectedWorker(worker)}
        />
      ))}

      {/* Info window */}
      {selectedWorker && (
        <InfoWindow
          position={{ lat: selectedWorker.current_gps_lat, lng: selectedWorker.current_gps_lng }}
          onCloseClick={() => setSelectedWorker(null)}
        >
          <div className="p-2">
            <p className="font-bold">{selectedWorker.full_name}</p>
            <p className="text-sm">{selectedWorker.area_name}</p>
            <p className="text-xs text-gray-500">
              Since {formatTime(selectedWorker.clock_in_time)}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};
```

---

## 📊 Analytics Charts

### Using Recharts

```typescript
// src/components/charts/AttendanceChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AttendanceChart = ({ data }: { data: AttendanceData[] }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="present" fill="#22c55e" name="Present" />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

```typescript
// src/components/charts/ConditionPieChart.tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

export const ConditionPieChart = ({ data }: { data: ConditionData[] }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="condition"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {data.map((entry, index) => (
            <Cell key={entry.condition} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── map/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   ├── workers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── areas/
│   │   │   ├── page.tsx
│   │   │   └── import/
│   │   │       └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── report-builder/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── map/
│   ├── charts/
│   ├── tables/
│   └── forms/
├── hooks/
│   ├── useActiveWorkers.ts
│   ├── useReports.ts
│   ├── useAreas.ts
│   └── useAnalytics.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
└── types/
```

---

## 🧪 Testing

### E2E with Playwright

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads with statistics', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=username]', 'supervisor');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Active Workers')).toBeVisible();
  await expect(page.locator('text=Reports Today')).toBeVisible();
});

test('reports page shows data table', async ({ page }) => {
  // ... login first
  await page.goto('/reports');
  
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('thead th')).toHaveCount(7);
});
```

---

## ✅ Success Criteria

1. ✅ All pages functional
2. ✅ Live map with real-time updates
3. ✅ Reports CRUD and review
4. ✅ Attendance tracking
5. ✅ Analytics visualizations
6. ✅ KMZ import working
7. ✅ Report builder functional
8. ✅ Mobile responsive
9. ✅ Performance optimized
10. ✅ E2E tests passing

---

## 📝 Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "recharts": "^2.10.0",
    "@react-google-maps/api": "^2.19.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "zustand": "^4.4.0",
    "next-auth": "^4.24.0",
    "date-fns": "^2.30.0"
  }
}
```

---

*Last Updated: January 2026*

