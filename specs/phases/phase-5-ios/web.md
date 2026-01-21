# Phase 5 - Web Dashboard Implementation Checklist

**Duration:** 3 days
**Prerequisites:** Phase 4 web dashboard deployed

---

## Overview

Add administrative features to the web dashboard for fraud monitoring, device management, and language/localization settings.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Fraud Dashboard | Fraud logs, statistics |
| Day 2 | Device Management | Trusted devices, attestation |
| Day 3 | Testing & Polish | Integration, i18n prep |

---

## New Pages

### Fraud Detection Dashboard

**Path:** `app/(dashboard)/admin/fraud/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Fraud Detection Dashboard                                |
+----------------------------------------------------------+
| Overview (Last 30 Days)                                   |
| +----------+ +----------+ +----------+ +----------+       |
| | Total    | | Mock     | | Velocity | | Device   |       |
| | Alerts   | | Location | | Anomaly  | | Tampering|       |
| |   47     | |   23     | |   15     | |    9     |       |
| +----------+ +----------+ +----------+ +----------+       |
+----------------------------------------------------------+
| Filters:                                                  |
| [Date Range] [Type: All v] [Status: All v] [User...]      |
+----------------------------------------------------------+
| Recent Fraud Alerts                                       |
| +--------------------------------------------------------+|
| | Time       | User      | Type           | Status       ||
| |------------|-----------|----------------|--------------|  |
| | 10:23 AM   | Ahmad R.  | Mock Location  | Detected     ||
| | 09:45 AM   | Budi S.   | Velocity       | Reviewed     ||
| | Yesterday  | Siti N.   | Device Tamper  | Dismissed    ||
| +--------------------------------------------------------+|
| [< 1 2 3 ... >]                                           |
+----------------------------------------------------------+
```

**Features:**
- [ ] Summary statistics cards
- [ ] Fraud logs data table
- [ ] Filter by date range
- [ ] Filter by fraud type
- [ ] Filter by status
- [ ] Search by user
- [ ] Detail modal on row click
- [ ] Review/dismiss actions

### Fraud Detail Modal

**Layout:**
```
+------------------------------------------+
|  Fraud Alert Details            [Close]  |
+------------------------------------------+
| Status: [Detected v]                     |
+------------------------------------------+
| User Information                         |
| Name: Ahmad Rizki                        |
| Username: ahmad_r                        |
| Role: Worker                             |
+------------------------------------------+
| Detection Details                        |
| Type: Mock Location                      |
| Detected: Jan 15, 2026 10:23 AM          |
| Location: -7.2891, 112.7411              |
| Accuracy: 5m                             |
+------------------------------------------+
| Device Information                       |
| Platform: Android                        |
| Model: Samsung Galaxy A52                |
| OS Version: Android 12                   |
| App Version: 1.2.0                       |
| Mock Location: Enabled                   |
| Rooted: No                               |
+------------------------------------------+
| Admin Notes                              |
| +--------------------------------------+ |
| | User acknowledged using mock app...  | |
| +--------------------------------------+ |
+------------------------------------------+
|            [Dismiss] [Confirm Fraud]     |
+------------------------------------------+
```

### Device Management Page

**Path:** `app/(dashboard)/admin/devices/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Device Management                                        |
+----------------------------------------------------------+
| Filters: [User...] [Platform: All v] [Trust: All v]       |
+----------------------------------------------------------+
| Registered Devices                                        |
| +--------------------------------------------------------+|
| | User      | Device       | Platform | Trust  | Last    ||
| |-----------|--------------|----------|--------|---------|  |
| | Ahmad R.  | iPhone 14    | iOS      | Trusted| Today   ||
| | Budi S.   | Galaxy A52   | Android  | Trusted| Today   ||
| | Siti N.   | Xiaomi Redmi | Android  | Untrust| 3d ago  ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Attestation History                                       |
| +--------------------------------------------------------+|
| | Time       | User      | Platform | Result   |         ||
| |------------|-----------|----------|----------|         ||
| | 10:00 AM   | Ahmad R.  | iOS      | Passed   |         ||
| | 09:30 AM   | Budi S.   | Android  | Passed   |         ||
| | Yesterday  | Siti N.   | Android  | Failed   |         ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
```

**Features:**
- [ ] Device list with user association
- [ ] Filter by user, platform, trust status
- [ ] Mark device as trusted/untrusted
- [ ] Remove device
- [ ] Attestation history
- [ ] Attestation result details

### User Fraud History

**Path:** Component in user detail page

**Layout:**
```
+------------------------------------------+
| Fraud History (User: Ahmad Rizki)        |
+------------------------------------------+
| Summary: 3 alerts (2 dismissed)          |
+------------------------------------------+
| | Date       | Type           | Status   |
| |------------|----------------|----------|
| | Jan 15     | Mock Location  | Dismissed|
| | Jan 10     | Velocity       | Confirmed|
| | Jan 5      | Mock Location  | Dismissed|
+------------------------------------------+
```

---

## Components

### Fraud Stats Cards

```typescript
// components/fraud/FraudStatsCards.tsx
interface FraudStats {
  total: number;
  mockLocation: number;
  velocityAnomaly: number;
  deviceTampering: number;
  attestationFailure: number;
}

export function FraudStatsCards({ stats }: { stats: FraudStats }) {
  const cards = [
    { label: 'Total Alerts', value: stats.total, icon: AlertTriangle },
    { label: 'Mock Location', value: stats.mockLocation, icon: MapPin },
    { label: 'Velocity Anomaly', value: stats.velocityAnomaly, icon: Zap },
    { label: 'Device Tampering', value: stats.deviceTampering, icon: Smartphone },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Fraud Log Table

```typescript
// components/fraud/FraudLogTable.tsx
const columns: ColumnDef<FraudLog>[] = [
  {
    accessorKey: 'detectedAt',
    header: 'Time',
    cell: ({ row }) => formatDateTime(row.original.detectedAt),
  },
  {
    accessorKey: 'user.fullName',
    header: 'User',
  },
  {
    accessorKey: 'fraudType',
    header: 'Type',
    cell: ({ row }) => <FraudTypeBadge type={row.original.fraudType} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button variant="ghost" onClick={() => openDetail(row.original)}>
        View
      </Button>
    ),
  },
];
```

### Fraud Type Badge

```typescript
// components/fraud/FraudTypeBadge.tsx
const fraudTypeConfig = {
  mock_location: { label: 'Mock Location', color: 'red' },
  velocity_anomaly: { label: 'Velocity Anomaly', color: 'orange' },
  device_tampering: { label: 'Device Tampering', color: 'purple' },
  attestation_failure: { label: 'Attestation Failure', color: 'yellow' },
  gps_spoofing: { label: 'GPS Spoofing', color: 'red' },
};

export function FraudTypeBadge({ type }: { type: string }) {
  const config = fraudTypeConfig[type] || { label: type, color: 'gray' };
  return <Badge variant={config.color}>{config.label}</Badge>;
}
```

### Device Card

```typescript
// components/devices/DeviceCard.tsx
interface DeviceCardProps {
  device: DeviceFingerprint;
  onToggleTrust: (id: string, trusted: boolean) => void;
  onRemove: (id: string) => void;
}

export function DeviceCard({ device, onToggleTrust, onRemove }: DeviceCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {device.platform === 'ios' ? <Apple /> : <Smartphone />}
          <CardTitle>{device.deviceModel}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>Platform: {device.platform}</p>
          <p>OS: {device.osVersion}</p>
          <p>App: {device.appVersion}</p>
          <p>Last seen: {formatRelative(device.lastSeenAt)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Switch
          checked={device.isTrusted}
          onCheckedChange={(checked) => onToggleTrust(device.id, checked)}
        />
        <Button variant="destructive" size="sm" onClick={() => onRemove(device.id)}>
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## API Hooks

```typescript
// lib/hooks/useFraud.ts
export function useFraudLogs(filters: FraudFilters) {
  return useQuery({
    queryKey: ['fraud-logs', filters],
    queryFn: () => fraudApi.getLogs(filters),
  });
}

export function useFraudStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ['fraud-stats', dateRange],
    queryFn: () => fraudApi.getStats(dateRange),
  });
}

export function useUpdateFraudStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; status: string; notes?: string }) =>
      fraudApi.updateStatus(data.id, data.status, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['fraud-logs']);
      queryClient.invalidateQueries(['fraud-stats']);
    },
  });
}

// lib/hooks/useDevices.ts
export function useUserDevices(userId?: string) {
  return useQuery({
    queryKey: ['devices', userId],
    queryFn: () => devicesApi.getDevices(userId),
  });
}

export function useToggleDeviceTrust() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { deviceId: string; trusted: boolean }) =>
      devicesApi.toggleTrust(data.deviceId, data.trusted),
    onSuccess: () => {
      queryClient.invalidateQueries(['devices']);
    },
  });
}
```

---

## Implementation Checklist

### Day 1: Fraud Dashboard

- [ ] Fraud logs page layout
- [ ] FraudStatsCards component
- [ ] FraudLogTable component
- [ ] FraudTypeBadge component
- [ ] Date range filter
- [ ] Fraud type filter
- [ ] Status filter
- [ ] User search
- [ ] Fraud detail modal
- [ ] Review/dismiss actions

### Day 2: Device Management

- [ ] Devices page layout
- [ ] Device list table
- [ ] Filter by user
- [ ] Filter by platform
- [ ] Filter by trust status
- [ ] Toggle device trust
- [ ] Remove device
- [ ] Attestation history table
- [ ] Device detail modal

### Day 3: Integration & Testing

- [ ] Add fraud menu to admin nav
- [ ] Add devices menu to admin nav
- [ ] User detail: fraud history section
- [ ] Component unit tests
- [ ] Integration tests
- [ ] Responsive design check

---

## Navigation Updates

```typescript
// Add to admin navigation
const adminNavItems = [
  // ... existing items
  {
    title: 'Fraud Detection',
    href: '/admin/fraud',
    icon: Shield,
  },
  {
    title: 'Devices',
    href: '/admin/devices',
    icon: Smartphone,
  },
];
```

---

## Success Criteria

1. Fraud dashboard shows real-time statistics
2. Fraud logs can be filtered and searched
3. Admin can review and dismiss fraud alerts
4. Device list shows all registered devices
5. Admin can toggle device trust status
6. All tables are responsive
7. Actions provide feedback (loading, success, error)

---

**Last Updated:** 2026-01-16
