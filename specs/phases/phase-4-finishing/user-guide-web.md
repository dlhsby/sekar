# Phase 4: Web Application User Guide

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Sub-Phases 4-1 through 4-5 Complete
**Related Sub-Phase:** 4-6
**Audience:** DLH Surabaya staff (all 8 roles)

---

## Current Codebase Facts (Post-Phase 3 Expected Values)

| Fact | Value |
|------|-------|
| Framework | Next.js 16.x, React 19.x, TailwindCSS 4.x |
| Pages | 35 (24 Phase 3 + 11 Phase 4) |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Auth | JWT with refresh token rotation, identifier-based login |
| Maps | Mapbox GL JS 3.x |
| Charts | Recharts 2.x |
| URL | https://sekar.wahyutrip.com |

---

## A. Getting Started

### A1. Accessing the Application

1. Open a web browser (Chrome, Firefox, Safari, or Edge recommended)
2. Navigate to **https://sekar.wahyutrip.com**
3. The login page will appear

> **Supported Browsers:** Chrome 90+, Firefox 90+, Safari 15+, Edge 90+. Mobile browsers are supported but the mobile app is recommended for field workers.

### A2. Logging In

1. Enter your **username** or **phone number** in the "Identifier" field
2. Enter your **password** in the "Password" field
3. Click **Masuk** (Login)
4. You will be redirected to the Dashboard

<!-- Screenshot: login-page.png -->

> **Forgot Password?** Contact your system administrator (`admin_system` or `superadmin`) to reset your password.

### A3. Understanding Your Role

Your role determines which features you can access:

| Role | Indonesian Label | Access Level |
|------|-----------------|--------------|
| `satgas` | Satgas | Own data, clock-in/out, tasks, activities, assets |
| `linmas` | Linmas | Same as satgas |
| `korlap` | Koordinator Lapangan | Team data, area management, reports, analytics |
| `admin_data` | Admin Data | Data management, imports, exports |
| `kepala_rayon` | Kepala Rayon | Rayon-wide data, reports, analytics |
| `top_management` | Top Management | City-wide dashboards (read-only) |
| `admin_system` | Admin Sistem | User management, system configuration |
| `superadmin` | Super Admin | Full system access |

### A4. Navigation

The sidebar menu shows options based on your role:

```
┌──────────────────────┐
│ 🏠 Dashboard         │  ← All roles
│ 👥 Pekerja           │  ← korlap+
│ 📋 Tugas             │  ← All roles
│ 📝 Aktivitas         │  ← All roles
│ ⏰ Lembur            │  ← All roles
│ 📅 Jadwal            │  ← korlap+
│ 🗺️ Monitoring        │  ← korlap+
│ 📊 Analitik          │  ← korlap+ (Phase 4)
│ 📄 Laporan           │  ← korlap+ (Phase 4)
│ 🔧 Aset              │  ← All roles (Phase 4)
│ 🏞️ Area              │  ← admin+
│ 🌐 Rayon             │  ← admin+
│ ⚙️ Pengaturan        │  ← admin+
└──────────────────────┘
```

---

## B. Dashboard

### B1. Worker Dashboard (satgas, linmas)

The worker dashboard shows:

- **Status Shift** — Current shift status (active/inactive) with clock-in/out times
- **Tugas Hari Ini** — Today's assigned tasks with completion status
- **Aktivitas Terbaru** — Recent activity submissions
- **Ringkasan Bulan Ini** — Monthly summary (attendance rate, tasks completed)

### B2. Supervisor Dashboard (korlap)

The supervisor dashboard shows:

- **Ringkasan Area** — Area summary cards (workers present, tasks progress)
- **Pekerja Aktif** — List of currently active workers with status indicators
- **Tugas Tertunda** — Pending tasks requiring action
- **Notifikasi** — Recent notifications (clock-in/out, task updates)

### B3. Management Dashboard (kepala_rayon, top_management)

The management dashboard shows:

- **KPI Cards** — Key performance indicators (attendance rate, task completion, worker count)
- **Peta Monitoring** — Interactive map with worker locations (live)
- **Tren Kehadiran** — Attendance trend chart (7-day)
- **Performa Rayon** — Rayon comparison table

---

## C. User Management (Pekerja)

**Available to:** `korlap`, `kepala_rayon`, `admin_data`, `admin_system`, `superadmin`

### C1. Viewing Workers

1. Click **Pekerja** in the sidebar
2. Use filters to narrow the list:
   - **Rayon** — Filter by rayon (7 sectors)
   - **Area** — Filter by specific area
   - **Role** — Filter by role type
   - **Status** — Active or deleted workers
3. Click a worker row to view details

### C2. Creating a New Worker

1. Click **+ Tambah Pekerja**
2. Fill in required fields:
   - **Nama Lengkap** — Full name
   - **Username** — Login username (unique)
   - **No. HP** — Phone number (unique, optional)
   - **Password** — Initial password
   - **Role** — Select worker role
   - **Rayon** — Assign to rayon
   - **Area** — Assign to area(s)
3. Optionally upload a **Foto Profil**
4. Click **Simpan**

### C3. Editing a Worker

1. Click the worker row or **Edit** button
2. Modify fields as needed
3. To assign multiple areas (for `korlap`):
   - Use the area multi-select dropdown
   - Each area assignment is tracked with type (`permanent` or `task_based`)
4. Click **Simpan**

### C4. Deactivating a Worker

1. Click the **Hapus** button on the worker row
2. Confirm the action
3. The worker is soft-deleted (can be restored by admin)

> **Note:** Deactivated workers cannot log in but their historical data is preserved.

---

## D. Task Management (Tugas)

### D1. Viewing Tasks

1. Click **Tugas** in the sidebar
2. View tasks filtered by:
   - **Status** — pending, in_progress, completed, cancelled
   - **Tanggal** — Date range
   - **Area** — Specific area
   - **Pekerja** — Assigned worker

### D2. Creating a Task (korlap+)

1. Click **+ Buat Tugas**
2. Fill in:
   - **Judul** — Task title
   - **Deskripsi** — Detailed description
   - **Area** — Target area
   - **Pekerja** — Assign to worker (optional, can assign later)
   - **Prioritas** — low, medium, high, urgent
   - **Deadline** — Due date and time
3. Click **Simpan**

### D3. Managing Task Workflow

Tasks follow this lifecycle:

```
pending → in_progress → completed
    ↓                      ↑
    └──→ cancelled    (or revision requested)
```

- **Approve** — Mark task as completed after reviewing evidence
- **Minta Revisi** — Request revision with notes (worker must resubmit)
- **Batalkan** — Cancel the task

### D4. Reviewing Task Evidence

1. Click on a completed task
2. Review the submitted activity (photos, notes, location)
3. Click **Setujui** to approve or **Minta Revisi** for changes

---

## E. Activity Management (Aktivitas)

### E1. Viewing Activities

1. Click **Aktivitas** in the sidebar
2. Filter by date, worker, area, or approval status
3. Click an activity to view full details including photos and GPS location

### E2. Approving Activities (korlap+)

1. Filter activities with status **Menunggu Persetujuan**
2. Review each activity:
   - Check photos match the described work
   - Verify GPS location is within the assigned area
   - Review timestamps
3. Click **Setujui** or **Tolak** with reason

---

## F. Overtime Management (Lembur)

### F1. Viewing Overtime Records

1. Click **Lembur** in the sidebar
2. View overtime records with filters:
   - **Status** — active, completed, approved, rejected
   - **Tanggal** — Date range
   - **Pekerja** — Specific worker

### F2. Approving Overtime (korlap+)

1. Filter overtime records with status **Menunggu Persetujuan**
2. Review details:
   - Clock-in time and location
   - Clock-out time and location (if completed)
   - Duration
   - Reason/notes
3. Click **Setujui** or **Tolak**

---

## G. Schedule Management (Jadwal)

**Available to:** `korlap`, `kepala_rayon`, `admin_data`, `admin_system`, `superadmin`

### G1. Viewing Schedules

1. Click **Jadwal** in the sidebar
2. View the weekly schedule grid showing:
   - Workers listed vertically
   - Days of the week horizontally
   - Shift assignments in each cell

### G2. Creating Schedules

1. Click **+ Buat Jadwal** or click an empty cell
2. Select:
   - **Pekerja** — Worker(s) to assign
   - **Shift** — Morning, afternoon, or custom
   - **Tanggal** — Date range
3. Click **Simpan**

### G3. Importing Schedules

1. Click **Import** button
2. Download the template CSV/Excel file
3. Fill in the schedule data
4. Upload the completed file
5. Review the preview and confirm

---

## H. Real-Time Monitoring (Monitoring)

**Available to:** `korlap`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`

### H1. Map Dashboard

1. Click **Monitoring** in the sidebar
2. The interactive map shows:
   - **Worker markers** with color-coded status:
     - 🟢 Green — Active (within area)
     - 🟡 Yellow — Inactive (clocked in, no recent activity)
     - 🔴 Red — Outside area boundary
     - ⚫ Gray — Missing (no GPS signal >15 min)
     - ⚪ White — Offline (not clocked in)
   - **Area boundaries** — Polygon overlays showing area borders
   - **Rayon boundaries** — Larger polygon overlays for rayon sectors

### H2. Using Map Controls

- **Zoom** — Scroll wheel or +/- buttons
- **Pan** — Click and drag
- **Filter** — Use the filter sidebar to show/hide by:
  - Rayon
  - Area
  - Worker status
  - Role
- **Auto-fit** — Click the center button to zoom to fit all visible workers

### H3. Worker Detail Panel

1. Click a worker marker on the map
2. The detail panel shows:
   - Worker name, role, area
   - Current status with timestamp
   - Shift times (clock-in/out)
   - GPS coordinates
   - Location history trail (last 2 hours)
3. Click **Lihat Profil** to navigate to the worker's full profile

### H4. Staffing Summary

The staffing summary panel shows:

- Total workers scheduled today
- Workers currently active
- Workers outside area
- Workers missing/offline
- Per-area breakdown

---

## I. Analytics Dashboard (Phase 4)

**Available to:** `korlap`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`

### I1. Dashboard Overview

1. Click **Analitik** in the sidebar
2. The dashboard displays:
   - **KPI Cards** — 4 key metrics at the top
   - **Attendance Trend** — 30-day line chart
   - **Task Completion** — Bar chart by area
   - **Worker Performance** — Distribution histogram

### I2. KPI Cards

| KPI | Description | Target |
|-----|-------------|--------|
| Tingkat Kehadiran | Percentage of workers clocked in vs scheduled | >90% |
| Penyelesaian Tugas | Tasks completed on time vs total assigned | >80% |
| Skor Rata-rata | Average worker performance score (0-100) | >75 |
| Kepatuhan Area | Time within assigned boundary vs total shift | >85% |

### I3. Worker Rankings

1. Navigate to **Analitik** → **Pekerja**
2. View the worker ranking table:
   - Sortable by performance score, attendance, task completion
   - Filter by rayon, area, date range
   - Color-coded grades: A (green), B (blue), C (yellow), D (red)
3. Click a worker row to view detailed performance breakdown

### I4. Area Comparison

1. Navigate to **Analitik** → **Area**
2. View area metrics:
   - Staffing coverage ratio
   - Average worker performance
   - Task backlog count
   - Maintenance frequency
3. Compare areas within a rayon or across all rayons

### I5. Filtering and Date Ranges

- Use the **date range picker** at the top to select:
  - Today, Last 7 Days, Last 30 Days, Custom Range
- Use the **rayon filter** to scope data
- Data refreshes every 5 minutes (cached via Redis)

---

## J. Reporting (Phase 4)

**Available to:** `korlap`, `kepala_rayon`, `top_management`, `admin_data`, `admin_system`, `superadmin`

### J1. Viewing Reports

1. Click **Laporan** in the sidebar
2. View the reports list with filters:
   - **Tipe** — Daily, Weekly, Monthly, Worker, Area, Overtime
   - **Status** — completed, generating, failed
   - **Tanggal** — Date range
3. Click a report to view or download

### J2. Generating a Report

1. Click **+ Buat Laporan**
2. Select a report template:
   - **Laporan Harian** — Daily operations (auto-generated 06:00 WIB)
   - **Laporan Mingguan** — Weekly performance summary
   - **Laporan Bulanan** — Monthly comprehensive report
   - **Laporan Pekerja** — Individual worker performance
   - **Laporan Area** — Area status and metrics
   - **Laporan Lembur** — Overtime utilization
3. Configure parameters:
   - **Tanggal/Periode** — Date or period to report on
   - **Rayon/Area** — Scope (defaults to your assignment)
   - **Format** — PDF, CSV, or Excel
4. Click **Buat** to generate
5. Wait for generation (PDF may take up to 30 seconds)
6. Download when ready

### J3. Report Schedules (admin+ only)

1. Navigate to **Laporan** → **Jadwal Laporan**
2. View existing scheduled reports
3. To create a new schedule:
   - Click **+ Jadwal Baru**
   - Select **Template** — which report to generate
   - Set **Frekuensi** — daily, weekly (day), monthly (date)
   - Set **Waktu** — generation time (WIB)
   - Set **Penerima** — email recipients
   - Set **Scope** — rayon/area filter
4. Click **Simpan**

> **Auto-generated Reports:** The system automatically generates Daily Operations Reports at 06:00 WIB for each rayon with active workers.

### J4. Understanding Report Contents

#### Daily Operations Report
- Attendance summary (present/absent/late)
- Shift coverage by area
- Tasks completed/pending
- Activities submitted/approved
- Overtime hours
- Notable events (boundary violations, missing workers)

#### Weekly Performance Report
- Week-over-week attendance trend
- Task completion rate
- Top and bottom performers
- Area coverage analysis

#### Monthly Summary Report
- Monthly KPI dashboard
- Worker performance rankings
- Area comparison
- Overtime analysis
- Recommendations

### J5. Downloading and Sharing

- **PDF** — Formatted report with charts and tables, suitable for printing
- **CSV** — Raw data for spreadsheet analysis
- **Excel** — Formatted spreadsheet with multiple sheets and charts

Click the download icon next to any completed report to save it locally.

---

## K. Asset Management (Phase 4)

**Available to:** All roles (with role-based scope)

### K1. Browsing Assets

1. Click **Aset** in the sidebar
2. View the asset list with filters:
   - **Kategori** — Alat Kebersihan, Alat Pertamanan, Mesin & Peralatan, Perlengkapan Keselamatan, Sarana Prasarana, Material & Bahan
   - **Status** — available, in_use, maintenance, retired, lost
   - **Area** — Filter by area assignment
3. Use the search bar to find assets by name or code

### K2. Asset Detail Page

Click an asset to view:

- **Informasi Aset** — Name, code, category, condition, location
- **QR Code** — Scannable QR code (click to enlarge or print)
- **Riwayat Peminjaman** — Assignment history (who, when, duration)
- **Riwayat Perawatan** — Maintenance records

### K3. Checking Out an Asset (satgas, linmas, korlap)

1. Find the asset (search or browse)
2. Click **Pinjam**
3. Confirm:
   - **Kondisi** — Current condition (good/fair/poor/damaged)
   - **Catatan** — Optional notes
   - **Tanggal Kembali** — Expected return date (optional)
4. Click **Konfirmasi**

> **Alternative:** Scan the asset's QR code using the mobile app for faster checkout.

### K4. Returning an Asset

1. Navigate to **Aset** → filter by **Saya** (My Assets)
2. Find the asset to return
3. Click **Kembalikan**
4. Fill in:
   - **Kondisi** — Condition at return
   - **Catatan** — Any damage or issues noted
5. Click **Konfirmasi**

### K5. Managing Assets (korlap+)

#### Creating an Asset

1. Click **+ Tambah Aset**
2. Fill in:
   - **Nama** — Asset name
   - **Kategori** — Select category
   - **Kode** — Auto-generated or manual (format: `{PREFIX}-{RAYON}-{SEQ}`)
   - **Area** — Assigned area
   - **Kondisi** — Initial condition
   - **Deskripsi** — Description
   - **Tanggal Pengadaan** — Acquisition date
   - **Harga** — Purchase price (optional)
3. Click **Simpan**

#### Editing an Asset

1. Click the asset row → **Edit**
2. Modify fields
3. Click **Simpan**

#### Retiring an Asset

1. Click the asset row → **Ubah Status**
2. Select **Retired** with reason
3. Click **Konfirmasi**

### K6. QR Code Management (admin+)

1. Navigate to **Aset** → **QR Code**
2. Select assets for bulk QR generation
3. Click **Generate QR**
4. Preview the QR codes in print-friendly layout
5. Click **Cetak** to print

### K7. Maintenance Management (korlap+)

1. Navigate to **Aset** → **Perawatan**
2. View the maintenance calendar
3. To create a maintenance record:
   - Click **+ Jadwal Perawatan**
   - Select **Aset** — which asset
   - Set **Tipe** — routine, repair, inspection, emergency
   - Set **Tanggal** — Scheduled date
   - Set **Catatan** — Description of work needed
4. Click **Simpan**
5. To complete a maintenance record:
   - Click the record → **Selesai**
   - Fill in actual work performed, cost, new condition
   - Click **Konfirmasi**

---

## L. Area & Rayon Management

**Available to:** `admin_data`, `admin_system`, `superadmin`

### L1. Area Management

1. Click **Area** in the sidebar
2. View all areas with their rayon assignment and worker count
3. Click an area to view:
   - Area details and boundary polygon on map
   - Assigned workers
   - Active tasks
   - Assets assigned to this area

### L2. Rayon Management

1. Click **Rayon** in the sidebar
2. View all 7 rayons with area counts
3. Click a rayon to view:
   - Rayon details and boundary
   - Areas within the rayon
   - Kepala rayon assignment

### L3. Importing Area Data

1. Navigate to **Area** → **Import**
2. Upload a **KMZ file** from Google Earth
3. Review the parsed boundaries on the map
4. Confirm to create or update areas

---

## M. System Settings (Pengaturan)

**Available to:** `admin_system`, `superadmin`

### M1. Monitoring Configuration

1. Navigate to **Pengaturan** → **Monitoring**
2. Configure thresholds:
   - **Inactive Timeout** — Minutes before worker marked inactive (default: 15)
   - **Missing Timeout** — Minutes before worker marked missing (default: 30)
   - **Boundary Tolerance** — GPS margin in meters (default: 100)
   - **Location Ping Interval** — Seconds between GPS updates (default: 60)

### M2. Shift Definitions

1. Navigate to **Pengaturan** → **Shift**
2. Manage shift templates:
   - Morning (06:00-14:00)
   - Afternoon (14:00-22:00)
   - Custom shifts

### M3. Special Days

1. Navigate to **Pengaturan** → **Hari Khusus**
2. Manage public holidays and special working days
3. These affect attendance calculations and scheduling

### M4. Notification Preferences

1. Navigate to **Pengaturan** → **Notifikasi**
2. Configure which events trigger push notifications:
   - Clock-in/out reminders
   - Task assignments
   - Overtime approvals
   - Boundary violations

---

## N. Common Workflows

### N1. Daily Supervisor Workflow (korlap)

1. **Morning (06:00-07:00):**
   - Check Dashboard → Ringkasan Area for today's schedule
   - Open Monitoring map to verify workers clocking in
   - Review any pending notifications

2. **Mid-day (11:00-12:00):**
   - Check Tugas → filter by "In Progress" to track task completion
   - Review submitted Aktivitas and approve/reject
   - Check Monitoring for any outside-area alerts

3. **End of day (14:00-15:00):**
   - Review Aktivitas → approve remaining submissions
   - Check Lembur → approve any overtime requests
   - Review daily report (auto-generated at 06:00 next day)

### N2. Weekly Report Workflow (kepala_rayon)

1. Navigate to **Laporan** → filter by "Mingguan"
2. Review the auto-generated weekly report
3. Navigate to **Analitik** → **Pekerja** for detailed performance
4. Identify workers needing attention (Grade D)
5. Export data to Excel if needed for meetings

### N3. New Worker Onboarding (admin_system)

1. Create user account: **Pekerja** → **+ Tambah Pekerja**
2. Assign to rayon and area(s)
3. Set up schedule: **Jadwal** → assign shifts
4. Provide credentials to the worker
5. Verify first clock-in in Monitoring

### N4. Asset Inventory Check (korlap)

1. Navigate to **Aset** → filter by your area
2. Review all assets and their current status
3. Check for overdue maintenance: **Aset** → **Perawatan** → filter "Terlambat"
4. Schedule any needed maintenance
5. Generate QR codes for new assets

---

**Last Updated:** 2026-03-13
