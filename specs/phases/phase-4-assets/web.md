# Phase 4 - Web Dashboard Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 3 web dashboard deployed

---

## Overview

Add comprehensive asset management pages to the web dashboard including inventory management, QR code generation, and maintenance scheduling calendar.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Assets List | Table, filters, bulk actions |
| Day 2 | Asset Details | Details page, history tabs |
| Day 3 | QR Code Generator | Bulk generation, print preview |
| Day 4 | Maintenance Calendar | Calendar view, scheduling |
| Day 5 | Testing & Polish | Integration, responsiveness |

---

## New Pages

### Assets List Page

**Path:** `app/(dashboard)/assets/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Assets Inventory          [+ Add Asset] [Generate QR]    |
+----------------------------------------------------------+
| Filters:                                                  |
| [Type: All v] [Status: All v] [Area: All v] [Search...]   |
+----------------------------------------------------------+
| [ ] | Code       | Name           | Type    | Status     |
|-----|------------|----------------|---------|------------|
| [ ] | ASSET-001  | Cangkul Besi   | Tool    | Available  |
| [ ] | ASSET-002  | Mesin Potong   | Machine | In Use     |
| [ ] | ASSET-003  | Gerobak        | Vehicle | Maintenance|
+----------------------------------------------------------+
| Showing 1-10 of 150 assets            [< 1 2 3 4 5 ... >] |
+----------------------------------------------------------+
| Selected: 3 items   [Assign] [Generate QR] [Export] [Del] |
+----------------------------------------------------------+
```

**Features:**
- [ ] Data table with TanStack Table
- [ ] Sortable columns
- [ ] Filter by type, status, area
- [ ] Search by name/code
- [ ] Bulk selection
- [ ] Bulk actions (assign, generate QR, export, delete)
- [ ] Pagination
- [ ] Export to CSV/Excel

### Asset Details Page

**Path:** `app/(dashboard)/assets/[id]/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  < Back to Assets                        [Edit] [Delete]  |
+----------------------------------------------------------+
| +----------------+  Asset Information                     |
| |                |  +---------------------------------+   |
| | [Asset Photo]  |  | Name: Cangkul Besi              |   |
| |                |  | Code: ASSET-ABC123              |   |
| +----------------+  | Type: Hand Tool                 |   |
|                     | Status: Available               |   |
| [QR Code Image]     | Condition: Good                 |   |
| [Print QR]          | Location: Taman Bungkul         |   |
|                     +---------------------------------+   |
+----------------------------------------------------------+
| [Details] [Assignment History] [Maintenance] [Reports]    |
+----------------------------------------------------------+
| Purchase Details                                          |
| Brand: Krisbow          Model: KW-001                     |
| Serial: SN-2024-0001    Purchase Date: 2024-01-15         |
| Purchase Price: Rp 150.000   Warranty Until: 2025-01-15   |
+----------------------------------------------------------+
```

**Features:**
- [ ] Asset summary card with photo
- [ ] QR code display and print button
- [ ] Tabbed content (Details, History, Maintenance, Reports)
- [ ] Edit asset modal
- [ ] Delete with confirmation
- [ ] Assignment history timeline
- [ ] Maintenance records list

### Add/Edit Asset Form

**Path:** `app/(dashboard)/assets/new/page.tsx` and modal

**Layout:**
```
+------------------------------------------+
|  Add New Asset                           |
+------------------------------------------+
| Basic Information                        |
| +--------------------------------------+ |
| | Name *          [                  ] | |
| | Asset Type *    [Select type     v] | |
| | Description     [                  ] | |
| +--------------------------------------+ |
|                                          |
| Details                                  |
| +--------------------------------------+ |
| | Brand           [                  ] | |
| | Model           [                  ] | |
| | Serial Number   [                  ] | |
| +--------------------------------------+ |
|                                          |
| Purchase Information                     |
| +--------------------------------------+ |
| | Purchase Date   [Select date     ] | |
| | Purchase Price  [Rp             ] | |
| | Warranty Until  [Select date     ] | |
| +--------------------------------------+ |
|                                          |
| Location                                 |
| +--------------------------------------+ |
| | Area            [Select area     v] | |
| | GPS Coordinates [Auto/Manual      ] | |
| +--------------------------------------+ |
|                                          |
| Photo                                    |
| +--------+                               |
| |  [+]   | Upload photo                  |
| +--------+                               |
|                                          |
|              [Cancel]  [Save Asset]      |
+------------------------------------------+
```

### QR Code Generator Page

**Path:** `app/(dashboard)/assets/qr-generator/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  QR Code Generator                                        |
+----------------------------------------------------------+
| Select Assets to Generate QR Codes                        |
+----------------------------------------------------------+
| [x] Select All   [Search assets...]                       |
| +--------------------------------------------------------+|
| | [x] ASSET-001 - Cangkul Besi                           ||
| | [x] ASSET-002 - Mesin Potong                           ||
| | [ ] ASSET-003 - Gerobak (already has QR)               ||
| +--------------------------------------------------------+|
| Selected: 2 assets                                        |
+----------------------------------------------------------+
|                    [Generate QR Codes]                    |
+----------------------------------------------------------+
| Preview                                                   |
| +--------+ +--------+ +--------+                          |
| | [QR]   | | [QR]   | | [QR]   |                          |
| | NAME1  | | NAME2  | | NAME3  |                          |
| | CODE1  | | CODE2  | | CODE3  |                          |
| +--------+ +--------+ +--------+                          |
+----------------------------------------------------------+
| Print Options:                                            |
| Size: [Small] [Medium] [Large]                            |
| Per Row: [2] [3] [4]                                      |
| Include: [x] Name [x] Code [ ] Type                       |
+----------------------------------------------------------+
|                              [Download PDF] [Print]       |
+----------------------------------------------------------+
```

**Features:**
- [ ] Asset selection list
- [ ] Bulk select
- [ ] QR code preview grid
- [ ] Print size options
- [ ] Layout options (2/3/4 per row)
- [ ] Include name/code/type options
- [ ] Download as PDF
- [ ] Print preview

### Maintenance Calendar Page

**Path:** `app/(dashboard)/maintenance/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Maintenance Schedule              [+ Schedule] [List]    |
+----------------------------------------------------------+
| [< Jan 2026 >]                                            |
| +--------------------------------------------------------+|
| | Sun | Mon | Tue | Wed | Thu | Fri | Sat |              ||
| |-----|-----|-----|-----|-----|-----|-----|              ||
| |     |     |     |  1  |  2  |  3  |  4  |              ||
| |     |     |     |     |[2]  |     |     |              ||
| |-----|-----|-----|-----|-----|-----|-----|              ||
| |  5  |  6  |  7  |  8  |  9  | 10  | 11  |              ||
| |     |[1]  |     |[3]  |     |     |     |              ||
| |-----|-----|-----|-----|-----|-----|-----|              ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Upcoming This Week                                        |
| +--------------------------------------------------------+|
| | Jan 6 - Oil Change - Mesin Potong #5     [Complete]    ||
| | Jan 8 - Inspection - Gerobak #12         [Start]       ||
| | Jan 8 - Sharpening - Cangkul #7          [Start]       ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Overdue (2)                                               |
| +--------------------------------------------------------+|
| | Jan 2 - Tire Check - Gerobak #3   [Mark Complete]      ||
| | Jan 3 - Cleaning - Mesin #2       [Mark Complete]      ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
```

**Features:**
- [ ] Calendar view with FullCalendar
- [ ] Maintenance events on calendar
- [ ] Click event to view details
- [ ] Drag to reschedule
- [ ] Upcoming maintenance list
- [ ] Overdue maintenance alerts
- [ ] Quick actions (start, complete)
- [ ] Create maintenance modal

### Maintenance Detail Modal

**Layout:**
```
+------------------------------------------+
|  Maintenance Details              [Edit] |
+------------------------------------------+
| Asset: Mesin Potong Rumput #5            |
| Type: Preventive                         |
| Status: Scheduled                        |
+------------------------------------------+
| Title: Monthly Oil Change                |
| Scheduled: January 6, 2026               |
| Priority: Medium                         |
| Estimated Cost: Rp 50.000                |
+------------------------------------------+
| Description:                             |
| Replace engine oil and filter. Check     |
| spark plug and air filter condition.     |
+------------------------------------------+
| Assigned To: Teknisi Ahmad               |
+------------------------------------------+
|         [Cancel] [Start] [Complete]      |
+------------------------------------------+
```

---

## Components

### QR Code Display Component

```typescript
// components/assets/QRCodeDisplay.tsx
import QRCode from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  includeLabel?: boolean;
  label?: string;
}

export function QRCodeDisplay({
  value,
  size = 128,
  includeLabel = true,
  label,
}: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center p-4 border rounded-lg">
      <QRCode value={value} size={size} level="H" />
      {includeLabel && (
        <span className="mt-2 text-sm font-mono">{label || value}</span>
      )}
    </div>
  );
}
```

### QR Print Template Component

```typescript
// components/assets/QRPrintTemplate.tsx
import { forwardRef } from 'react';

interface QRPrintTemplateProps {
  assets: Asset[];
  size: 'small' | 'medium' | 'large';
  perRow: 2 | 3 | 4;
  showName: boolean;
  showCode: boolean;
  showType: boolean;
}

export const QRPrintTemplate = forwardRef<HTMLDivElement, QRPrintTemplateProps>(
  ({ assets, size, perRow, showName, showCode, showType }, ref) => {
    const sizeMap = { small: 100, medium: 150, large: 200 };
    const qrSize = sizeMap[size];

    return (
      <div ref={ref} className="print-container">
        <div className={`grid grid-cols-${perRow} gap-4`}>
          {assets.map((asset) => (
            <div key={asset.id} className="qr-card">
              <QRCode value={asset.assetCode} size={qrSize} />
              {showName && <p className="font-bold">{asset.name}</p>}
              {showCode && <p className="font-mono">{asset.assetCode}</p>}
              {showType && <p className="text-gray-600">{asset.assetType.name}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
```

### Maintenance Calendar Component

```typescript
// components/maintenance/MaintenanceCalendar.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

interface MaintenanceCalendarProps {
  events: MaintenanceEvent[];
  onEventClick: (event: MaintenanceEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: MaintenanceEvent, newDate: Date) => void;
}

export function MaintenanceCalendar({
  events,
  onEventClick,
  onDateClick,
  onEventDrop,
}: MaintenanceCalendarProps) {
  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.scheduledDate,
    backgroundColor: getStatusColor(e.status),
    extendedProps: e,
  }));

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={calendarEvents}
      eventClick={(info) => onEventClick(info.event.extendedProps)}
      dateClick={(info) => onDateClick(info.date)}
      editable={true}
      eventDrop={(info) => onEventDrop(info.event.extendedProps, info.event.start)}
    />
  );
}
```

### Asset Status Badge Component

```typescript
// components/assets/AssetStatusBadge.tsx
const statusConfig = {
  available: { color: 'green', label: 'Available' },
  in_use: { color: 'blue', label: 'In Use' },
  maintenance: { color: 'orange', label: 'Maintenance' },
  retired: { color: 'gray', label: 'Retired' },
  lost: { color: 'red', label: 'Lost' },
};

export function AssetStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.available;
  return (
    <Badge variant={config.color}>{config.label}</Badge>
  );
}
```

---

## API Hooks

```typescript
// lib/hooks/useAssets.ts
export function useAssets(filters: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assetsApi.getAssets(filters),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.getAsset(id),
  });
}

export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: ['asset-history', id],
    queryFn: () => assetsApi.getAssetHistory(id),
  });
}

export function useCreateAsset() {
  return useMutation({
    mutationFn: assetsApi.createAsset,
    onSuccess: () => queryClient.invalidateQueries(['assets']),
  });
}

// lib/hooks/useMaintenance.ts
export function useMaintenanceCalendar(month: Date) {
  return useQuery({
    queryKey: ['maintenance-calendar', month],
    queryFn: () => maintenanceApi.getCalendar(month),
  });
}

export function useUpcomingMaintenance() {
  return useQuery({
    queryKey: ['upcoming-maintenance'],
    queryFn: () => maintenanceApi.getUpcoming(),
  });
}

export function useOverdueMaintenance() {
  return useQuery({
    queryKey: ['overdue-maintenance'],
    queryFn: () => maintenanceApi.getOverdue(),
  });
}
```

---

## Implementation Checklist

### Day 1: Assets List Page

- [ ] Assets list page layout
- [ ] Data table with TanStack Table
- [ ] Column definitions (code, name, type, status, etc.)
- [ ] Sorting functionality
- [ ] Filter components (type, status, area)
- [ ] Search input
- [ ] Pagination
- [ ] Bulk selection
- [ ] Export to CSV

### Day 2: Asset Details Page

- [ ] Asset details page layout
- [ ] Asset summary card
- [ ] Photo display
- [ ] QR code display
- [ ] Tab navigation
- [ ] Details tab content
- [ ] Assignment history tab
- [ ] Maintenance history tab
- [ ] Edit asset modal
- [ ] Delete confirmation dialog

### Day 3: QR Code Generator

- [ ] QR generator page layout
- [ ] Asset selection list
- [ ] Select all / search
- [ ] QR code preview grid
- [ ] Print size selector
- [ ] Layout options (2/3/4 per row)
- [ ] Include options (name, code, type)
- [ ] Print preview component
- [ ] react-to-print integration
- [ ] Download as PDF

### Day 4: Maintenance Calendar

- [ ] Maintenance calendar page
- [ ] FullCalendar integration
- [ ] Event rendering with colors
- [ ] Event click handler
- [ ] Create maintenance modal
- [ ] Edit maintenance modal
- [ ] Upcoming maintenance list
- [ ] Overdue maintenance alerts
- [ ] Quick action buttons

### Day 5: Testing & Polish

- [ ] Component unit tests
- [ ] Integration tests
- [ ] Responsive design check
- [ ] Print preview testing
- [ ] Calendar interaction testing
- [ ] Form validation
- [ ] Error handling
- [ ] Loading states

---

## Dependencies

```bash
npm install qrcode.react          # QR code generation
npm install react-to-print        # Print functionality
npm install jspdf                 # PDF generation
npm install @fullcalendar/react   # Calendar
npm install @fullcalendar/daygrid
npm install @fullcalendar/interaction
```

---

## Success Criteria

1. Assets list displays with filtering and sorting
2. Asset details show all information and history
3. QR codes can be generated and printed in bulk
4. Maintenance calendar shows scheduled items
5. Maintenance can be created and managed
6. All forms validate correctly
7. Print preview works across browsers
8. Responsive on tablet and desktop

---

**Last Updated:** 2026-01-16
