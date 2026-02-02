# Phase 4: Web Dashboard Implementation Guide

**Component:** Web Dashboard (Next.js + TypeScript + React)
**Developer Role:** Web Developer
**Duration:** 6-8 weeks

---

## Overview

Phase 4 web work adds analytics dashboards, asset management, and iOS-related admin features to the existing Next.js 16.1.4 web dashboard.

---

## Part A: Analytics & Reporting (Weeks 1-2)

### Pages to Create

#### 1. Analytics Dashboard (`/dashboard/analytics`)

**Location:** `fe/web/src/app/(dashboard)/analytics/page.tsx`

**Components:**
```typescript
export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.analytics.getDashboardStats(),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <NBCard>
        <h2>Worker Performance</h2>
        <WorkerPerformanceChart data={stats?.workerPerformance} />
      </NBCard>

      <NBCard>
        <h2>Area Coverage</h2>
        <AreaCoverageHeatmap data={stats?.areaCoverage} />
      </NBCard>

      <NBCard>
        <h2>System Metrics</h2>
        <SystemMetricsTable data={stats?.systemMetrics} />
      </NBCard>
    </div>
  );
}
```

#### 2. Worker Analytics (`/dashboard/analytics/workers`)

**Features:**
- List of all workers with performance metrics
- Sortable table (attendance rate, task completion, punctuality)
- Filter by Rayon, date range
- Export to CSV/Excel
- Drill-down to individual worker details

**Chart Components:**
- **recharts** for performance trends
- **leaflet.heat** for geographic heatmaps
- Custom KPI cards with trend indicators

#### 3. Area Analytics (`/dashboard/analytics/areas`)

**Features:**
- Coverage rate by area
- Condition rating trends
- Issue frequency heatmap
- Geographic visualization with Mapbox GL

#### 4. Report Builder (`/dashboard/reports/builder`)

**Features:**
- Template selection (daily attendance, weekly performance, monthly operational)
- Custom report configuration (columns, filters, format)
- Schedule reports (cron expression builder)
- Set email recipients
- Preview before generation

#### 5. Report Archive (`/dashboard/reports/archive`)

**Features:**
- List of generated reports
- Download, regenerate, or delete reports

---

## Part B: Asset Management (Weeks 3-4)

### Pages to Create

#### 1. Assets List (`/dashboard/assets`)

**Features:**
- Table with all assets
- Filter by type, status, current holder
- Search by asset code or name
- Bulk actions (assign, retire)
- Generate QR codes (batch)

#### 2. Asset Details (`/dashboard/assets/[id]`)

**Sections:**
- Asset information (editable)
- Current assignment
- Assignment history (timeline)
- Maintenance records
- QR code (view/download/print)
- Photos

#### 3. QR Code Generator (`/dashboard/assets/qr-generator`)

**Dependencies:**
```bash
npm install qrcode
```

**Implementation:**
```typescript
import QRCode from 'qrcode';

export const QRCodeGenerator = ({ assetCode }: { assetCode: string }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(assetCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }).then(setQrDataUrl);
  }, [assetCode]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${assetCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    // Create printable QR code using DOM manipulation
    const printDiv = document.createElement('div');
    printDiv.style.textAlign = 'center';

    const title = document.createElement('h2');
    title.textContent = assetCode;
    printDiv.appendChild(title);

    const img = document.createElement('img');
    img.src = qrDataUrl;
    printDiv.appendChild(img);

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.body.appendChild(printDiv);
    printWindow?.print();
  };

  return (
    <NBCard>
      <img src={qrDataUrl} alt={`QR Code for ${assetCode}`} />
      <div className="flex gap-4">
        <NBButton onClick={handleDownload}>Download</NBButton>
        <NBButton onClick={handlePrint}>Print</NBButton>
      </div>
    </NBCard>
  );
};
```

**Batch Generation:**
- Select multiple assets
- Generate all QR codes
- Download as ZIP file
- Print all on A4 pages (6 per page)

#### 4. Maintenance Schedule (`/dashboard/maintenance`)

**Dependencies:**
```bash
npm install react-big-calendar
```

**Features:**
- Calendar view of scheduled maintenance
- Month/Week/Day views
- Create maintenance records
- Assign to technicians
- Track completion status
- Send reminders (7 days before)

---

## Part C: iOS Platform Support (Weeks 5-6)

### Pages to Create

#### 1. iOS App Configuration (`/dashboard/settings/ios`)

**Features:**
- APNs certificate upload
- Apple Developer Team configuration
- App Store Connect integration status
- TestFlight beta testing management
- App version tracking

#### 2. Push Notification Dashboard (`/dashboard/notifications/ios`)

**Features:**
- View APNs notification delivery stats
- Test push notifications to iOS devices
- View failed deliveries and errors
- Device token management

---

## API Integration

### React Query Hooks

```typescript
// lib/api/analytics.ts
export const analyticsQueries = {
  dashboard: () => ({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get('/analytics/dashboard'),
  }),

  workers: (filters: WorkerFilters) => ({
    queryKey: ['analytics', 'workers', filters],
    queryFn: () => api.get('/analytics/workers', { params: filters }),
  }),
};

// lib/api/assets.ts
export const assetsQueries = {
  list: (filters: AssetFilters) => ({
    queryKey: ['assets', filters],
    queryFn: () => api.get('/assets', { params: filters }),
  }),

  details: (id: string) => ({
    queryKey: ['assets', id],
    queryFn: () => api.get(`/assets/${id}`),
  }),
};
```

---

## Charts & Visualizations

### Dependencies

```bash
npm install recharts          # Charts
npm install leaflet.heat      # Heat maps
npm install d3                # Custom visualizations
```

---

## Testing

### Component Tests

```bash
npm test -- analytics/page.test.tsx
npm test -- assets/page.test.tsx
npm test -- reports/builder/page.test.tsx
```

### E2E Tests (Playwright)

```bash
npm run test:e2e -- analytics.spec.ts
npm run test:e2e -- assets.spec.ts
npm run test:e2e -- reports.spec.ts
```

---

## Success Criteria

**Analytics:**
- [ ] Dashboards load within 2 seconds
- [ ] Charts render correctly
- [ ] Reports can be exported
- [ ] Automated reports send on schedule

**Assets:**
- [ ] QR codes generate correctly
- [ ] Asset assignment workflow works
- [ ] Maintenance calendar displays properly

**iOS:**
- [ ] APNs configuration can be saved
- [ ] Push notification testing works

---

## Related Documentation

- [Backend Implementation](./backend.md)
- [Mobile Implementation](./mobile.md)
- [iOS Platform](./ios.md)
- [Testing Guide](./testing.md)
- [Timeline](./timeline.md)
