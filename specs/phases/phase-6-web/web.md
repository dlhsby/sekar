# Phase 6 - Web Dashboard Implementation Checklist

**Duration:** 12 days
**Prerequisites:** Phase 5 web dashboard deployed

---

## Overview

Complete the web dashboard with full CRUD capabilities for all entities, advanced reporting, bulk operations, system settings, and audit logging.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1-2 | User Management | Full CRUD, roles |
| Day 3-4 | Area Management | Map editor, CRUD |
| Day 5-6 | Asset Management | CRUD, QR printing |
| Day 7 | Bulk Operations | Import/export |
| Day 8-9 | Report Builder | Custom reports |
| Day 10 | Scheduled Reports | Scheduling UI |
| Day 11 | System Settings | Config panel |
| Day 12 | Audit Logging | Log viewer |

---

## New Pages

### User Management

**Path:** `app/(dashboard)/users/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Users Management            [+ Add User] [Import CSV]    |
+----------------------------------------------------------+
| Filters: [Role: All v] [Area: All v] [Status: All v]      |
| Search: [________________________________] [Search]       |
+----------------------------------------------------------+
| [ ] | Username  | Full Name      | Role       | Area     |
|-----|-----------|----------------|------------|----------|
| [ ] | worker1   | Ahmad Rizki    | Worker     | Bungkul  |
| [ ] | super1    | Siti Nurhaliza | Supervisor | -        |
| [ ] | admin1    | Budi Santoso   | Admin      | -        |
+----------------------------------------------------------+
| Showing 1-10 of 50 users           [< 1 2 3 4 5 >]        |
+----------------------------------------------------------+
| Selected: 0           [Bulk Edit] [Export] [Delete]       |
+----------------------------------------------------------+
```

**Features:**
- [ ] Users data table with sorting
- [ ] Filter by role
- [ ] Filter by assigned area
- [ ] Filter by status (active/inactive)
- [ ] Search by name/username
- [ ] Bulk selection
- [ ] Add user modal
- [ ] Edit user modal
- [ ] Delete with confirmation
- [ ] CSV import
- [ ] CSV/Excel export

**Path:** `app/(dashboard)/users/[id]/page.tsx`

**User Detail Features:**
- [ ] User profile summary
- [ ] Edit profile form
- [ ] Role management
- [ ] Area assignment (for workers)
- [ ] Shift history
- [ ] Report history
- [ ] Activity log
- [ ] Reset password
- [ ] Deactivate/activate

### Area Management

**Path:** `app/(dashboard)/areas/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Areas Management                         [+ Add Area]    |
+----------------------------------------------------------+
| View: [List] [Map]                                        |
+----------------------------------------------------------+
| List View:                                                |
| +--------------------------------------------------------+|
| | Name          | Type    | Workers | Coverage | Status  ||
| |---------------|---------|---------|----------|---------|  |
| | Taman Bungkul | Taman   | 5       | 98%      | Active  ||
| | Taman Surya   | Taman   | 3       | 95%      | Active  ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Map View:                                                 |
| +--------------------------------------------------------+|
| |                 [Interactive Map]                       ||
| |     [Taman Bungkul]  [Taman Surya]                     ||
| |           ●               ●                             ||
| |                                                         ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
```

**Features:**
- [ ] Areas list view with table
- [ ] Areas map view
- [ ] Filter by type
- [ ] Filter by status
- [ ] Search by name
- [ ] Add area with map editor
- [ ] Edit area with map editor
- [ ] Delete area (if no workers assigned)
- [ ] View assigned workers
- [ ] Coverage statistics

### Area Map Editor

```typescript
// components/areas/AreaMapEditor.tsx
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';

interface AreaMapEditorProps {
  initialCenter?: [number, number];
  initialRadius?: number;
  onSave: (center: [number, number], radius: number) => void;
}

export function AreaMapEditor({ initialCenter, initialRadius, onSave }: AreaMapEditorProps) {
  const [center, setCenter] = useState(initialCenter || [-7.2756, 112.7138]);
  const [radius, setRadius] = useState(initialRadius || 100);

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setCenter([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  return (
    <div className="space-y-4">
      <MapContainer center={center} zoom={15} className="h-[400px] rounded-lg">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler />
        <Circle
          center={center}
          radius={radius}
          pathOptions={{ color: '#2E7D32', fillColor: '#4CAF50', fillOpacity: 0.3 }}
        />
        <Marker position={center} />
      </MapContainer>

      <div className="flex items-center gap-4">
        <Label>Radius (meters)</Label>
        <Slider
          value={[radius]}
          onValueChange={([v]) => setRadius(v)}
          min={50}
          max={500}
          step={10}
        />
        <span>{radius}m</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Latitude</Label>
          <Input value={center[0]} disabled />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={center[1]} disabled />
        </div>
      </div>

      <Button onClick={() => onSave(center, radius)}>Save Location</Button>
    </div>
  );
}
```

### Asset Management (Expanded)

**Path:** `app/(dashboard)/assets/page.tsx`

**Additional Features:**
- [ ] Asset type management
- [ ] Maintenance schedule view
- [ ] QR code batch printing
- [ ] Asset assignment history
- [ ] Condition tracking

### Bulk Operations Page

**Path:** `app/(dashboard)/admin/import-export/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Import / Export Data                                     |
+----------------------------------------------------------+
| Import Data                                               |
| +--------------------------------------------------------+|
| | Entity: [Users v] [Areas v] [Assets v]                 ||
| |                                                        ||
| | +------------------------------------------+           ||
| | |  Drag and drop CSV file here            |           ||
| | |  or click to browse                      |           ||
| | +------------------------------------------+           ||
| |                                                        ||
| | [Download Template]                                    ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Export Data                                               |
| +--------------------------------------------------------+|
| | Entity: [Users] [Areas] [Assets] [Reports] [Shifts]   ||
| | Format: [CSV] [Excel]                                  ||
| | Filters: [Date Range] [Area] [Status]                  ||
| |                                                        ||
| | [Export]                                               ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
```

**Features:**
- [ ] CSV file upload (drag & drop)
- [ ] Template download per entity
- [ ] Import validation preview
- [ ] Import progress indicator
- [ ] Import result summary
- [ ] Error report download
- [ ] Export entity selection
- [ ] Export format selection
- [ ] Export filters

### Report Builder Page

**Path:** `app/(dashboard)/reports/builder/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Report Builder                                           |
+----------------------------------------------------------+
| Report Type                                               |
| [Attendance] [Performance] [Reports] [Custom]             |
+----------------------------------------------------------+
| Configuration                    | Preview                |
| +---------------------------+    | +--------------------+ |
| | Date Range               |    | |                    | |
| | [Start] - [End]          |    | | [Preview Table]    | |
| |                          |    | |                    | |
| | Filters                  |    | |                    | |
| | Area: [All v]            |    | |                    | |
| | Worker: [All v]          |    | |                    | |
| |                          |    | |                    | |
| | Columns (drag to order)  |    | |                    | |
| | [x] Worker Name          |    | |                    | |
| | [x] Date                 |    | |                    | |
| | [x] Clock In             |    | |                    | |
| | [x] Clock Out            |    | |                    | |
| | [ ] Duration             |    | +--------------------+ |
| +---------------------------+                             |
+----------------------------------------------------------+
| [Save as Template]  [Schedule]  [PDF] [CSV] [Excel]       |
+----------------------------------------------------------+
```

**Features:**
- [ ] Report type selection
- [ ] Date range picker
- [ ] Filter configuration
- [ ] Column selection (checkboxes)
- [ ] Column ordering (drag & drop)
- [ ] Live preview
- [ ] Generate PDF
- [ ] Generate CSV
- [ ] Generate Excel
- [ ] Save as template
- [ ] Schedule report

### Scheduled Reports Page

**Path:** `app/(dashboard)/reports/scheduled/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Scheduled Reports                     [+ New Schedule]   |
+----------------------------------------------------------+
| Active Schedules                                          |
| +--------------------------------------------------------+|
| | Name            | Type       | Schedule  | Next Run    ||
| |-----------------|------------|-----------|-------------|  |
| | Daily Attendance| Attendance | Daily 8AM | Tomorrow    ||
| | Weekly Summary  | Performance| Mon 9AM   | In 3 days   ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Recent Runs                                               |
| +--------------------------------------------------------+|
| | Schedule        | Run Time   | Status    | Recipients  ||
| |-----------------|------------|-----------|-------------|  |
| | Daily Attendance| Today 8AM  | Success   | 3 emails    ||
| | Weekly Summary  | Jan 6 9AM  | Success   | 2 emails    ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
```

**Features:**
- [ ] List active schedules
- [ ] Create schedule modal
- [ ] Cron expression builder
- [ ] Recipient email input
- [ ] Enable/disable toggle
- [ ] Run now button
- [ ] Edit schedule
- [ ] Delete schedule
- [ ] Recent runs history
- [ ] Run status indicator

### System Settings Page

**Path:** `app/(dashboard)/admin/settings/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  System Settings                                          |
+----------------------------------------------------------+
| General                                                   |
| +--------------------------------------------------------+|
| | Organization Name: [DLH Surabaya                   ] ||
| | System Email:      [admin@DLH.surabaya.go.id       ] ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Attendance                                                |
| +--------------------------------------------------------+|
| | Grace Period (minutes):      [5      ]                 ||
| | GPS Validation Radius (m):   [100    ]                 ||
| | Maximum Shift Duration (h):  [12     ]                 ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Reports                                                   |
| +--------------------------------------------------------+|
| | Max Photos per Report:       [5      ]                 ||
| | Default Report Format:       [PDF v  ]                 ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
| Notifications                                             |
| +--------------------------------------------------------+|
| | Enable Email Notifications:  [x]                       ||
| | Daily Summary Time:          [08:00  ]                 ||
| +--------------------------------------------------------+|
+----------------------------------------------------------+
|                              [Reset to Defaults] [Save]   |
+----------------------------------------------------------+
```

**Features:**
- [ ] Settings grouped by category
- [ ] Input validation
- [ ] Save with confirmation
- [ ] Reset to defaults
- [ ] Settings change history
- [ ] Responsive layout

### Audit Log Page

**Path:** `app/(dashboard)/admin/audit-log/page.tsx`

**Layout:**
```
+----------------------------------------------------------+
|  Audit Log                                    [Export]    |
+----------------------------------------------------------+
| Filters:                                                  |
| [User: All v] [Action: All v] [Entity: All v]            |
| [Date: Last 7 days v] [Search...]                        |
+----------------------------------------------------------+
| | Timestamp        | User      | Action | Entity | Name  |
| |------------------|-----------|--------|--------|-------|
| | Jan 15 10:23 AM  | admin1    | Create | User   | work5 |
| | Jan 15 10:20 AM  | super1    | Update | Area   | Bungk |
| | Jan 15 09:45 AM  | admin1    | Delete | Asset  | Cangk |
+----------------------------------------------------------+
| [< 1 2 3 4 5 ... >]                                       |
+----------------------------------------------------------+
```

**Features:**
- [ ] Audit log data table
- [ ] Filter by user
- [ ] Filter by action (create/update/delete)
- [ ] Filter by entity type
- [ ] Filter by date range
- [ ] Search
- [ ] View change details modal
- [ ] Diff viewer for updates
- [ ] Export to CSV

### Change Diff Modal

```typescript
// components/audit/ChangeDiffModal.tsx
import { DiffEditor } from '@monaco-editor/react';

interface ChangeDiffModalProps {
  log: AuditLog;
  open: boolean;
  onClose: () => void;
}

export function ChangeDiffModal({ log, open, onClose }: ChangeDiffModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Change Details</DialogTitle>
          <DialogDescription>
            {log.action} {log.entityType} by {log.user?.fullName}
          </DialogDescription>
        </DialogHeader>

        {log.action === 'update' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Before</h4>
              <pre className="bg-red-50 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(log.oldValue, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">After</h4>
              <pre className="bg-green-50 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(log.newValue || log.oldValue, null, 2)}
          </pre>
        )}

        <div className="text-sm text-muted-foreground">
          <p>IP Address: {log.ipAddress}</p>
          <p>Time: {formatDateTime(log.createdAt)}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Components

### CSV Import Component

```typescript
// components/import/CSVImporter.tsx
import { useDropzone } from 'react-dropzone';

interface CSVImporterProps {
  entityType: 'users' | 'areas' | 'assets';
  onImport: (result: ImportResult) => void;
}

export function CSVImporter({ entityType, onImport }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: async (files) => {
      setFile(files[0]);
      const previewData = await parseCSVPreview(files[0], 5);
      setPreview(previewData);
    },
  });

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    const result = await importApi[entityType](formData);
    onImport(result);
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">Drag and drop CSV file here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
      </div>

      {preview.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Preview (first 5 rows)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(preview[0]).map((key) => (
                  <TableHead key={key}>{key}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow key={i}>
                  {Object.values(row).map((val, j) => (
                    <TableCell key={j}>{val as string}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {file && (
        <div className="flex justify-between items-center">
          <span>{file.name}</span>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Cron Builder Component

```typescript
// components/reports/CronBuilder.tsx
const presets = [
  { label: 'Daily at 8 AM', cron: '0 8 * * *' },
  { label: 'Weekly on Monday 9 AM', cron: '0 9 * * 1' },
  { label: 'First day of month', cron: '0 9 1 * *' },
];

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [usePreset, setUsePreset] = useState(true);

  return (
    <div className="space-y-4">
      <RadioGroup value={usePreset ? 'preset' : 'custom'}>
        <RadioGroupItem value="preset" onClick={() => setUsePreset(true)}>
          Use preset
        </RadioGroupItem>
        <RadioGroupItem value="custom" onClick={() => setUsePreset(false)}>
          Custom
        </RadioGroupItem>
      </RadioGroup>

      {usePreset ? (
        <Select value={value} onValueChange={onChange}>
          {presets.map((p) => (
            <SelectItem key={p.cron} value={p.cron}>
              {p.label}
            </SelectItem>
          ))}
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0 8 * * *"
          />
          <p className="text-sm text-muted-foreground">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## API Hooks

```typescript
// lib/hooks/useUsers.ts
export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.getUsers(filters),
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => queryClient.invalidateQueries(['users']),
  });
}

export function useBulkImportUsers() {
  return useMutation({
    mutationFn: (formData: FormData) => usersApi.bulkImport(formData),
  });
}

// lib/hooks/useAuditLogs.ts
export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.getLogs(filters),
  });
}

// lib/hooks/useSettings.ts
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => queryClient.invalidateQueries(['settings']),
  });
}
```

---

## Implementation Checklist

### Day 1-2: User Management
- [ ] Users list page
- [ ] User filters
- [ ] Add user modal
- [ ] Edit user modal
- [ ] Delete user
- [ ] User detail page
- [ ] Shift history
- [ ] Report history
- [ ] Reset password

### Day 3-4: Area Management
- [ ] Areas list page
- [ ] Areas map view
- [ ] Add area modal
- [ ] AreaMapEditor component
- [ ] Edit area modal
- [ ] Delete area
- [ ] Assigned workers

### Day 5-6: Asset Management
- [ ] Full CRUD (from Phase 4)
- [ ] Asset type management
- [ ] QR batch printing
- [ ] Assignment tracking

### Day 7: Bulk Operations
- [ ] CSVImporter component
- [ ] Template downloads
- [ ] Import preview
- [ ] Import progress
- [ ] Error report
- [ ] Export functionality

### Day 8-9: Report Builder
- [ ] Report builder page
- [ ] Type selection
- [ ] Date range picker
- [ ] Filter config
- [ ] Column selection
- [ ] Column ordering
- [ ] Preview
- [ ] Generate PDF/CSV/Excel
- [ ] Save as template

### Day 10: Scheduled Reports
- [ ] Schedules list
- [ ] Create schedule modal
- [ ] CronBuilder component
- [ ] Recipients input
- [ ] Enable/disable
- [ ] Run now
- [ ] Run history

### Day 11: System Settings
- [ ] Settings page
- [ ] Category grouping
- [ ] Input validation
- [ ] Save settings
- [ ] Reset defaults

### Day 12: Audit Logging
- [ ] Audit log page
- [ ] Filters
- [ ] Search
- [ ] ChangeDiffModal
- [ ] Export

---

## Dependencies

```bash
npm install react-dropzone         # File upload
npm install papaparse              # CSV parsing
npm install @tanstack/react-table  # Already installed
npm install react-leaflet          # Map editor
npm install leaflet
npm install @types/leaflet --save-dev
npm install react-sortablejs       # Drag & drop ordering
```

---

## Success Criteria

1. Full CRUD for users, areas, assets
2. Bulk import from CSV works
3. Export to CSV/Excel works
4. Report builder generates reports
5. Scheduled reports run on time
6. System settings configurable
7. All admin actions logged
8. Audit log searchable
9. All pages responsive

---

**Last Updated:** 2026-01-16
