# Phase 5: Web Application User Guide

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 5 Sub-Phases 5-1 through 5-5 Complete
**Related Sub-Phase:** 5-6
**Audience:** DLH Surabaya staff (all 8 roles)

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Framework | Next.js 16.x, React 19.x, TailwindCSS 4.x |
| Pages | 35 (24 Phase 4 + 11 Phase 5) |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Auth | JWT with refresh token rotation, identifier-based login |
| Maps | Google Maps 3.x |
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
│ 📊 Analitik          │  ← korlap+ (Phase 5)
│ 📄 Laporan           │  ← korlap+ (Phase 5)
│ 🔧 Aset              │  ← All roles (Phase 5)
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

## I. Analytics Dashboard (Phase 5)

**Available to:** All roles (scoped by role)

### I1. Dashboard Overview

1. Click **Analitik** in the sidebar
2. The dashboard displays:
   - **KPI Cards** — Key metrics with 7-day trend indicators (↑↓)
   - **Attendance Trend** — 30-day line chart
   - **Task Completion** — Bar chart by area
   - **Area Coverage** — Grouped bar chart showing staffing + tasks per area

### I2. KPI Cards & Role-Based Scope

| Role | Dashboard Scope | KPIs Visible |
|------|----------------|--------------|
| `satgas`, `linmas` | Own metrics only | Attendance, tasks, activities, location compliance |
| `korlap` | Assigned area(s) | Team attendance, area tasks, average score |
| `admin_data` | Own area (like korlap) | Team metrics, area summary |
| `kepala_rayon` | Own rayon (all areas) | Rayon-wide attendance, task completion, KPI cards |
| `top_management` | System-wide | All metrics, all rayons |
| `admin_system`, `superadmin` | System-wide | All metrics, all rayons |

**Note:** Analytics are NOT real-time — they reflect data from the last nightly refresh (02:00 WIB). Data may be up to 24 hours stale.

### I3. Worker Rankings

1. Navigate to **Analitik** → **Pekerja**
2. View the worker ranking table:
   - **Ranking Kinerja** — Top performers with horizontal bar chart (score 0-100)
   - **Tabel Detail** — Nama, Area, Hadir (%), Tugas (%), Skor, Grade (A/B/C/D)
   - Sortable by performance score, attendance, task completion
   - Filter by rayon, area, date range
   - Color-coded grades: A (90+), B (80-89), C (70-79), D (<70)
3. Click a worker row to view detailed performance breakdown:
   - Attendance calendar heatmap (30-day)
   - Punctuality (on-time arrivals %)
   - Task completion rate and average duration
   - Activity submission + approval rates
   - Area compliance % (within boundary)
   - Overtime hours (if any)

### I4. Area Comparison

1. Navigate to **Analitik** → **Area**
2. View area metrics cards showing:
   - **Taman Bungkul** — Staff: 8/10, Tasks: 12, Score: 85 (B)
   - **Taman Apsari** — Staff: 5/5, Tasks: 8, Score: 91 (A)
   - (... more areas ...)
3. Area Comparison Chart shows:
   - Grouped bars: staffing coverage + open task count per area
   - Compare within rayon or across rayons
4. Click an area card to drill down into detailed area analytics

### I5. Filtering and Date Ranges

- Use the **date range picker** at the top to select:
  - Today, Last 7 Days, Last 30 Days, Custom Range
- Use the **rayon filter** to scope data to a specific rayon
- Data refreshes every 5 minutes from Redis cache
- Click **Menyegarkan** to manually refresh all materialized views (admin+ only)

---

## J. Reporting (Phase 5)

**Available to:** `korlap`, `kepala_rayon`, `top_management`, `admin_data`, `admin_system`, `superadmin`

### J1. Viewing Reports

1. Click **Laporan** in the sidebar
2. The reports dashboard shows:
   - **Filter tabs** — Harian, Mingguan, Bulanan, Semua
   - **Reports list** with columns: Judul, Tanggal, Format (PDF), [Unduh]
   - **Pagination** for large report lists
3. Click the **[Unduh]** button to download a generated report

### J2. Generating a Report

1. Click **+ Buat Laporan** button
2. The report builder form appears with:
   - **Tipe Laporan** — Dropdown: Harian, Mingguan, Bulanan, Pekerja, Area, Lembur
   - **Format** — Radio buttons: PDF, CSV, Excel
   - **Periode** — Date range picker (e.g., 01/03/2026 — 13/03/2026)
   - **Rayon** — Dropdown (defaults to your rayon; system-wide for admin)
   - **Area** — Dropdown (optional, filters to area level)
   - **Pekerja** — Dropdown (only for "Laporan Pekerja" type)
3. Click **Buat Laporan**
4. System returns 202 Accepted with status "processing"
5. Report appears in the list with status "Memproses..." then "Selesai"
6. PDF generation takes up to 30 seconds; CSV/Excel faster
7. Download presigned URL available once complete

### J3. Report Types & Contents

| Type | Auto-Gen | Frequency | Contents | Audience |
|------|----------|-----------|----------|----------|
| **Laporan Operasional Harian** | Yes | Daily 06:00 WIB | Attendance, tasks, activities, overtime, alerts | kepala_rayon, top_management, admin |
| **Laporan Kinerja Mingguan** | Yes | Monday 07:00 WIB | Attendance trend, task completion, top/bottom performers, area comparison | kepala_rayon, top_management, admin |
| **Laporan Ringkasan Bulanan** | Yes | 1st of month 08:00 WIB | KPI dashboard, worker rankings, area comparison, overtime, recommendations | top_management, admin |
| **Laporan Pekerja** | No | On-demand | Worker profile, attendance calendar, punctuality, task/activity performance, compliance, overtime, composite score | korlap+, for assigned workers |
| **Laporan Area** | No | On-demand | Area profile, staffing, task status, maintenance status, coverage quality, worker performance ranking | korlap+, for assigned areas |
| **Laporan Utilisasi Lembur** | No | On-demand | Overtime summary, cost estimate, worker breakdown, trends, approval efficiency, rayon comparison | kepala_rayon, top_management, admin |

### J4. Report Schedules (admin+ only)

1. Navigate to **Laporan** → **Jadwal Laporan**
2. View default schedules:
   - Laporan Harian - Rayon Utara (06:00 WIB, Aktif)
   - Laporan Harian - Rayon Selatan (06:00 WIB, Aktif)
   - ... (one per rayon)
   - Laporan Mingguan - All Rayons (Monday 07:00, Aktif)
   - Laporan Bulanan - Sistem (1st day 08:00, Aktif)
3. To create a custom schedule:
   - Click **+ Buat Jadwal Baru**
   - **Template** — Select report type
   - **Frekuensi** — daily, weekly (select day), monthly (select date)
   - **Waktu** — Generation time (WIB)
   - **Scope** — Rayon, area, worker filters (optional)
4. Click **Simpan**
5. Schedule appears in list; use [Edit], [Hapus], or toggle On/Off

> **Auto-generated Reports:** Default schedules generate automatically at specified times and store reports in S3. Non-admins receive reports if they have read access to the rayon/area.

### J5. Export Formats

- **PDF** — Formatted report with charts, tables, header/footer. Suitable for printing and sharing.
- **CSV** — Comma-separated values for spreadsheet import. Includes all detail rows.
- **Excel** — `.xlsx` with multiple sheets, formatted headers, bold/color styling, auto-fit columns.

Each generated report has a presigned S3 URL valid for 24 hours (auto-refreshes on download).

---

## K. Asset Management (Phase 5)

**Available to:** All roles (with role-based scope)

### K1. Browsing Assets

1. Click **Aset** in the sidebar
2. View the asset list with filters & status tabs:
   - **Status tabs** — [Semua], [Tersedia], [Digunakan], [Perawatan]
   - **Kategori** — Alat Kebersihan, Alat Pertamanan, Kendaraan Operasional, Peralatan Keamanan, Peralatan Irigasi, Perlengkapan Umum
   - **Area** — Filter by area assignment
3. Use the search bar to find assets by name or code (e.g., "AK-RU-001" or "Sapu")
4. Each asset card shows: Kode, Nama, Kategori, Status (● color-coded), Location

**Status Colors:**
- 🟢 Tersedia (Available) — Ready to checkout
- 🟠 Digunakan (In Use) — Assigned to a worker
- 🔴 Perawatan (Maintenance) — Not available
- ⚫ Retired/Lost — Terminal states

### K2. Asset Detail Page

Click an asset to open the detail view:

- **Informasi** — Kode, Nama, Kategori, Area, Status, Kondisi
- **QR Code** — Large QR image (click to enlarge, [Unduh], [Cetak])
- **Riwayat Peminjaman** — Table with dates, assignee, checkout condition, return condition, duration
- **Riwayat Perawatan** — Table with dates, type (routine/repair/inspect), status, cost

### K3. Checking Out an Asset (satgas, linmas, korlap)

1. Find the asset and open detail view
2. Click **[Pinjam]** button (only visible if status = "Tersedia")
3. Modal appears with:
   - **Aset** — Asset code + name (read-only)
   - **Kondisi** — Dropdown: Baik, Cukup, Kurang, Rusak
   - **Catatan** — Optional notes field
   - **Tanggal Kembali Diharapkan** — Date picker (optional)
4. Click **[Konfirmasi]**
5. Checkout recorded with timestamp, assignee, and initial condition
6. Asset status changes to "Digunakan"

> **Mobile Alternative:** Scan the asset's QR code in the mobile app → [Pinjam] for faster checkout.

### K4. Returning an Asset

1. Navigate to **Aset**, filter to **Digunakan** status
2. Find the asset to return (or search for it)
3. Open asset detail → Click **[Kembalikan]**
4. Modal appears with:
   - **Aset** — Code + name (read-only)
   - **Kondisi Saat Kembali** — Dropdown: Baik, Cukup, Kurang, Rusak
   - **Catatan** — Damage notes (required if condition degraded)
5. If condition worsened (e.g., was "Baik", now "Rusak"):
   - System prompts for notes (required)
   - Asset moves to "Perawatan" status automatically
6. Click **[Konfirmasi]**
7. Assignment record updated with return date, condition, notes

### K5. Creating & Managing Assets (korlap+)

#### Creating an Asset

1. Click **[+ Tambah Aset]** button
2. Form fields:
   - **Nama** — Asset name (e.g., "Sapu Lidi #1")
   - **Kategori** — Dropdown: 6 categories
   - **Kode** — Auto-filled (format: `{PREFIX}-{RAYON}-{SEQ}`, e.g., AK-RU-001), editable
   - **Area** — Dropdown (required for area-level assets)
   - **Kondisi** — Baik, Cukup, Kurang, Rusak
   - **Deskripsi** — Optional description
   - **Tanggal Pengadaan** — Date picker
   - **Harga** — Optional purchase price
3. Click **[Simpan]**

#### Editing an Asset

1. Open asset detail → Click **[Edit]**
2. Modify fields
3. Click **[Simpan]**

#### Retiring/Retiring an Asset

1. Open asset detail → Click **[Delete]** or status button
2. Select **Status** — Retired or Lost
3. Add reason (optional)
4. Click **[Konfirmasi]**

### K6. QR Code Generation

#### Single QR Code
1. Open asset detail → **QR Code** section
2. Click **[Unduh QR]** to download PNG (300x300px)
3. Click **[Cetak]** to print with asset code label

#### Bulk QR Generation
1. Navigate to **Aset** → **[QR Batch]** button (or generator page)
2. Select multiple assets using checkboxes
3. Click **[Pilih Semua]** to select all visible
4. Click **[Generate QR]**
5. Preview shows grid layout (4x5 per A4 page) with:
   - QR code image
   - Asset code below (e.g., "AK-RU-001")
   - Asset name below code
6. Click **[Cetak Semua]** or **[Unduh PDF]** for printable layout

### K7. Maintenance Management (korlap+)

1. Navigate to **Aset** → **[Perawatan]** (or Maintenance Calendar)
2. Calendar view shows:
   - Month/year selector (< Maret 2026 >)
   - Dates with ● markers for scheduled maintenance
   - **Upcoming** section below (list of next maintenances)
   - **Overdue** section (red highlight, past-due records)
3. To schedule maintenance:
   - Click **[+ Jadwalkan]** or click a date on calendar
   - **Aset** — Search + select asset
   - **Tipe** — Routine, Repair, Inspection, Replacement
   - **Tanggal Dijadwalkan** — Date picker
   - **Catatan** — Work description
   - **Estimasi Biaya** — Optional cost estimate
   - Click **[Simpan]**
4. To mark as completed:
   - Click the maintenance record → **[Selesai]**
   - **Status** — Completed (read-only)
   - **Tanggal Selesai** — Timestamp
   - **Biaya Aktual** — Cost incurred
   - **Kondisi Setelah Perawatan** — Baik, Cukup, Kurang, Rusak
   - Click **[Konfirmasi]**
   - Asset status returns to "Tersedia" and `last_maintenance_at` is updated

**Overdue Maintenance Alert:** Daily cron (08:00 WIB) marks maintenance past due date as "OVERDUE" and sends notification to asset korlap and area supervisors.

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
