# Phase 5: Mobile Application User Guide

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 5 Sub-Phases 5-1 through 5-5 Complete
**Related Sub-Phase:** 5-6
**Audience:** DLH Surabaya field workers and supervisors

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Framework | React Native 0.83.x, React 19.x, Redux Toolkit |
| Screens | 30 (22 Phase 4 + 8 Phase 5) |
| Platforms | Android (Google Play), iOS (App Store, Phase 5) |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Offline | SyncManager with queue-based sync |
| App Name | SEKAR - Sistem Evaluasi Kinerja |

---

## A. Installation & Setup

### A1. Android Installation

1. Open **Google Play Store** on your Android device
2. Search for **"SEKAR DLH Surabaya"**
3. Tap **Install**
4. Wait for download and installation to complete
5. Tap **Open** to launch the app

> **Minimum Requirements:** Android 8.0 (Oreo) or later, 100 MB free storage.

### A2. iOS Installation (Phase 5)

1. Open **App Store** on your iPhone
2. Search for **"SEKAR Sistem Evaluasi Kinerja"**
3. Tap **Get** → authenticate with Face ID, Touch ID, or Apple ID password
4. Wait for download and installation
5. Tap **Open** to launch

> **Minimum Requirements:** iOS 15.0 or later (iPhone 7 and newer).

### A3. Permissions

On first launch, the app will request these permissions:

| Permission | Why | When |
|------------|-----|------|
| **Lokasi** (Location) | Clock-in verification, monitoring | First clock-in |
| **Kamera** (Camera) | Selfie verification, QR scanning, activity photos | First clock-in or photo |
| **Notifikasi** (Notifications) | Task assignments, reminders, alerts | App launch |
| **Penyimpanan** (Storage) | Download reports (Android only) | First download |

> **Important:** Location permission must be set to **"Always Allow"** for background tracking during active shifts. If set to "While Using," GPS updates will stop when the app is in the background.

### A4. First Login

1. Launch the SEKAR app
2. Enter your **username** or **phone number**
3. Enter your **password**
4. Tap **Masuk**
5. If prompted, allow required permissions

<!-- Screenshot: mobile-login.png -->

### A5. iOS-Specific: Apple Sign-In (Phase 5)

On iOS devices, an additional login option is available:

1. Tap **Sign in with Apple** button below the login form
2. Authenticate with Face ID or Touch ID
3. Choose to share or hide your email
4. Your Apple ID will be linked to your SEKAR account

> **First-time Apple Sign-In:** If your Apple ID is not yet linked to a SEKAR account, contact your admin to create one first, then link via Profile settings.

### A6. iOS-Specific: Biometric Login (Phase 5)

After enabling biometrics in Settings:

1. Launch the app
2. If returning after 5+ minutes in background, biometric prompt appears
3. Authenticate with **Face ID** or **Touch ID**
4. App unlocks to your previous screen

---

## B. Worker Guide (satgas, linmas)

### B1. Home Screen

The home screen shows your daily summary:

```
┌─────────────────────────────┐
│ Selamat Pagi, Ahmad!        │
├─────────────────────────────┤
│ ┌─ Status Shift ───────────┐│
│ │ ● Belum Clock-In         ││
│ │ Jadwal: 06:00 - 14:00    ││
│ │ Area: Taman Bungkul      ││
│ │ [Clock In]               ││
│ └───────────────────────────┘│
│                              │
│ ┌─ Tugas Hari Ini ──────── ┐│
│ │ 3 tugas • 1 selesai      ││
│ │ ► Bersihkan jalur jogging ││
│ │ ► Pangkas rumput zona A   ││
│ │ ► Siram tanaman zona B    ││
│ └───────────────────────────┘│
│                              │
│ ┌─ Lokasi Saya ────────────┐│
│ │ [Map showing your area]   ││
│ │ ● Di dalam area           ││
│ └───────────────────────────┘│
└─────────────────────────────┘
```

### B2. Clock-In

1. Tap **Clock In** on the home screen
2. Wait for GPS verification:
   - ✅ Green check — You are within your area boundary
   - ⚠️ Warning — You are outside the area (clock-in still allowed)
3. Take a **selfie** when prompted (optional, depends on config):
   - Face the camera
   - Ensure good lighting
   - Tap the capture button
4. Tap **Konfirmasi Clock In**
5. Your shift is now active

> **Offline Clock-In:** If you have no internet connection, the clock-in is saved locally and will sync when connection is restored. A banner will show "Offline - data akan disinkronkan."

### B3. Clock-Out

1. Navigate to Home screen
2. Tap **Clock Out**
3. Take a selfie if prompted
4. Confirm the clock-out
5. Your shift summary is displayed (duration, tasks completed)

### B4. Viewing and Completing Tasks

1. Tap **Tugas** in the bottom navigation
2. View your assigned tasks
3. Tap a task to view details:
   - Description
   - Priority (low/medium/high/urgent)
   - Deadline
   - Location/area
4. To mark as in-progress: Tap **Mulai Kerjakan**
5. To complete: Tap **Selesai** after submitting related activity

### B5. Submitting Activities

1. Tap **Aktivitas** in the bottom navigation
2. Tap **+ Buat Aktivitas**
3. Fill in:
   - **Jenis** — Select activity type
   - **Deskripsi** — What work was done
   - **Foto** — Take 1-4 photos of completed work
   - **Tugas** — Link to a task (optional)
4. GPS location is automatically attached
5. Tap **Kirim**

> **Photo Tips:** Take clear photos showing the before/after of your work. Include context (e.g., park area, equipment used). Photos are uploaded in the background.

### B6. Overtime Clock-In

1. After your regular shift ends:
2. If assigned overtime, tap **Clock In Lembur** on home screen
3. Take selfie and confirm
4. When overtime is done, tap **Clock Out Lembur**
5. Your overtime is submitted for supervisor approval

### B7. Viewing Your Performance (Phase 5)

1. Tap **Kinerja** in the bottom navigation (available for all roles)
2. View your performance card showing:
   - **Skor Kinerja** — Large number (0-100) with Grade (A/B/C/D)
   - **Quick Stats Cards** — 4 columns: Hadir (%), Tpw (punctuality %), Tugas (task %), Lokasi (location %)
   - **Tren Kehadiran** — 7-day bar chart showing daily attendance
   - **Tugas Bulan Ini** — Progress bar showing "Selesai: 23/28 (82%)"
3. Tap **[30 Hari]** picker at top to change period (7/30/90 days or custom range)
4. Data updates every 5 minutes

**Grades:**
- **A** — Score 90-100 (Excellent)
- **B** — Score 80-89 (Good)
- **C** — Score 70-79 (Fair)
- **D** — Score <70 (Needs Improvement)

### B8. Asset Management (Phase 5)

#### Browsing Assets

1. Tap **Aset** in the bottom navigation
2. Asset list shows:
   - **[Semua], [Tersedia], [Saya]** tabs (status filter)
   - Asset cards: 🧹 icon, Nama, Code, Status (●), Area
   - Search bar at top for name/code lookup
3. Tap **[🔍]** search icon to filter
4. Tap **[📷]** camera icon to open QR scanner

#### Checking Out (Borrowing) an Asset

1. **Via List:**
   - Tap **[Semua]** or **[Tersedia]** tab
   - Find asset by browsing or search
   - Tap asset card → **[Pinjam]** button

2. **Via QR Scan:**
   - Tap **[📷]** camera icon
   - Point at asset's QR code
   - App auto-reads JSON: `{"code": "AK-RU-001", "id": "uuid", "app": "sekar"}`
   - Asset detail loads → **[Pinjam]**

3. **Checkout Confirmation Screen:**
   - Asset code + name (read-only)
   - **Kondisi Sekarang** — Picker: Baik, Cukup, Kurang, Rusak
   - **Catatan** — Optional notes
   - **Tanggal Kembali Diharapkan** — Date picker (optional)
   - **[Konfirmasi Pinjam]** button

4. On success:
   - Assignment recorded with timestamp
   - Asset status changes to "Digunakan"
   - Confirmation toast shown

#### Returning an Asset

1. Tap **Aset** → **[Saya]** tab (shows only your checked-out assets)
2. Find the asset to return
3. Tap asset card → **[Kembalikan]** button
4. Return screen appears:
   - Asset code + name (read-only)
   - **Kondisi Saat Kembali** — Picker: Baik, Cukup, Kurang, Rusak
   - **Catatan** — Notes field (required if condition degraded)
5. If condition worsened:
   - System highlights the degradation
   - Prompts for notes (mandatory)
   - Asset moves to "Perawatan" status after return
6. Tap **[Konfirmasi]** to complete return

#### QR Code Scanning Details

1. Tap the **[📷]** camera icon from asset list
2. Camera view opens with:
   - Full-screen camera feed
   - Scanning frame overlay
   - **[Torch]** button (top-right, toggles flashlight)
   - **[Ketik Kode Manual]** button (bottom, for damaged QR codes)
3. Point camera at QR code for 1-2 seconds
4. Auto-detection triggers when QR is fully in frame
5. If offline or QR unreadable:
   - Tap **[Ketik Kode Manual]**
   - Type asset code (e.g., "AK-RU-001")
   - Tap **[Cari]** — looks up offline cache first, then server when online

> **Offline QR Scanning:** QR code parsing works fully offline. Asset info loads from cache if previously viewed. If not cached, asset code is displayed and full details fetch when connection restores.

---

## C. Supervisor Guide (korlap)

### C1. Supervisor Home Screen

Your home screen includes additional information:

```
┌─────────────────────────────┐
│ Selamat Pagi, Budi! (Korlap)│
├─────────────────────────────┤
│ ┌─ Tim Hari Ini ───────────┐│
│ │ Hadir: 8/10 pekerja      ││
│ │ ● 6 aktif  ● 1 tidak aktif│
│ │ ● 1 di luar area         ││
│ └───────────────────────────┘│
│                              │
│ ┌─ Tugas Area ──────────── ┐│
│ │ 12 tugas • 5 selesai     ││
│ │ 3 menunggu persetujuan    ││
│ └───────────────────────────┘│
│                              │
│ [Monitoring Map]             │
│ [Aktivitas Menunggu: 4]      │
└─────────────────────────────┘
```

### C2. Monitoring Map Dashboard

1. Tap **Monitoring** in the bottom navigation
2. The map shows all your team members:
   - 🟢 Active (within area)
   - 🟡 Inactive (no recent movement)
   - 🔴 Outside area
   - ⚫ Missing (no GPS >15 min)
3. Tap a worker marker for details:
   - Name, status, last update time
   - Clock-in time
   - Location history trail
4. Use filters to show/hide by status
5. Tap **Auto Focus** to zoom to fit all workers

### C3. Approving Activities

1. From home screen, tap **Aktivitas Menunggu** count
2. Or navigate to **Aktivitas** → filter "Menunggu"
3. Review each activity:
   - Photos and description
   - GPS location (shown on map)
   - Timestamp
   - Linked task (if any)
4. Tap ✅ **Setujui** or ❌ **Tolak** (with reason)

### C4. Managing Tasks

1. Tap **Tugas** in the navigation
2. View all tasks for your area(s)
3. To create a task:
   - Tap **+ Buat Tugas**
   - Set title, description, area, worker, priority, deadline
   - Tap **Simpan**
4. To reassign: Open task → **Ubah Pekerja** → select new worker
5. To review completion: Open completed task → review evidence → approve

### C5. Overtime Management

1. Tap **Lembur** in the navigation
2. View overtime records for your team
3. Filter by status: **Menunggu** for pending approval
4. Review each record and **Setujui** or **Tolak**

### C6. Team Analytics (Phase 5)

1. Tap **Analitik** in the bottom navigation (or **Tim** tab for supervisors)
2. Team analytics dashboard shows:
   - **Summary Cards** — Hadir: 8/10, Tugas: 12, Skor Rata: 85.2 (B)
   - **Top Performers** — Ranked list showing top 3-5 workers with scores
   - **Needs Attention** — Workers with low scores (D grade) requiring follow-up
3. **Tap a worker card** to drill into individual performance:
   - Same detail as personal analytics (score card, charts, metrics)
4. **[Area ▼]** filter at top (if multi-area korlap):
   - Switch between assigned areas
   - Summary updates to show area-specific team metrics

### C7. Reports (Phase 5)

1. Tap **Laporan** in the bottom navigation (korlap+ only)
2. Reports screen shows:
   - **[Harian], [Mingguan], [Bulanan]** filter tabs
   - **List of generated reports** with:
     - Title (e.g., "Laporan Operasional Harian - Rayon Utara")
     - Date generated
     - Format icon (📄 PDF)
     - **[Unduh]** button
3. **To view a report:**
   - Tap **[Unduh]** → downloads to device
   - Opens in default PDF viewer (or share menu)
4. **To generate a custom report:**
   - Tap **[+ Buat Laporan]** button
   - Form appears with:
     - **Tipe Laporan** — Picker: Harian, Mingguan, Bulanan, Pekerja, Area, Lembur
     - **Periode** — Date range (defaults to last 30 days)
     - **Format** — Radio: PDF, CSV, Excel (recommended: PDF for mobile)
     - **Scope** — Auto-filled by role; admin can select rayon/area
   - Tap **[Buat]** → queues generation
   - New report appears in list with status "Memproses..."
   - Download available once status changes to "Selesai"

> **Auto-generated Reports:** System generates Daily Operations Reports automatically at 06:00 WIB for your rayon. These appear in the list automatically (no action needed).

### C8. Asset Management (Phase 5)

In addition to worker asset features (checkout/return/QR scan), korlap can:

1. **View all area assets:**
   - Tap **Aset** → **[Semua]** tab shows all assigned area assets
   - Browse by status or search by code/name

2. **Schedule maintenance:**
   - Open asset detail → scroll to "Riwayat Perawatan"
   - Tap **[+ Jadwalkan Perawatan]**
   - Form: Tipe, Tanggal, Catatan
   - Tap **[Simpan]**

3. **Complete maintenance:**
   - View pending maintenance on asset detail
   - Tap **[Selesai]** → fill in actual work done, cost, new condition
   - Tap **[Konfirmasi]** → asset returns to "Tersedia"

4. **View asset utilization:**
   - Asset detail → "Riwayat Peminjaman" (assignment history)
   - See checkout/return dates, who used it, conditions recorded

---

## D. Rayon Manager Guide (kepala_rayon)

### D1. Rayon Overview

As `kepala_rayon`, you see data for your entire rayon (multiple areas):

1. Home screen shows rayon-wide summary
2. Monitoring map covers all areas in your rayon
3. Analytics and reports are scoped to rayon level

### D2. Rayon Analytics (Phase 5)

1. Tap **Analitik**
2. View rayon-level dashboard:
   - Area comparison cards
   - Overall rayon performance score
   - Worker rankings across all areas
3. Drill down into specific areas by tapping area cards

### D3. Rayon Reports (Phase 5)

1. Tap **Laporan**
2. Generate rayon-level reports:
   - Select any report type
   - Scope is automatically set to your rayon
   - Can drill down to specific areas
3. Auto-generated reports include all areas in your rayon

---

## E. Offline Mode

### E1. How Offline Mode Works

When your device loses internet connection:

1. A **banner** appears at the top: "Anda sedang offline"
2. You can continue working:
   - Clock-in/out is saved locally
   - Activities are queued for upload
   - Tasks can be viewed (cached)
   - Asset QR scanning works (cached data)
3. When connection restores:
   - Banner changes to "Menyinkronkan..."
   - All queued data uploads automatically
   - Banner disappears when complete

### E2. What Works Offline

| Feature | Offline Support |
|---------|----------------|
| Clock-in/out | ✅ Queued for sync |
| Activity submission | ✅ Photos cached, queued |
| View tasks | ✅ Cached data |
| View assets | ✅ If previously loaded |
| QR scanning | ✅ Code read, lookup when online |
| Monitoring map | ❌ Requires live connection |
| Analytics | ❌ Requires live connection |
| Report generation | ❌ Requires live connection |
| Report download | ✅ If previously downloaded |

### E3. Troubleshooting Sync Issues

If data is not syncing after reconnection:

1. Pull down on any screen to manually refresh
2. Check the sync indicator in the top bar
3. Navigate to **Profile** → **Sinkronisasi** to see pending items
4. If items are stuck, tap **Coba Lagi**
5. If persistent, force close and reopen the app

---

## F. Notifications

### F1. Notification Types

| Notification | Audience | Trigger |
|-------------|----------|---------|
| Pengingat Clock-In | Workers | 15 min before shift |
| Tugas Baru | Workers | Task assigned |
| Aktivitas Disetujui | Workers | Activity approved |
| Aktivitas Ditolak | Workers | Activity rejected |
| Lembur Disetujui | Workers | Overtime approved |
| Pekerja di Luar Area | Supervisors | Worker left boundary |
| Pekerja Hilang | Supervisors | No GPS >15 min |
| Perawatan Jatuh Tempo | Supervisors | Asset maintenance due |

### F2. Managing Notifications

1. Navigate to **Profile** → **Notifikasi**
2. Toggle individual notification types on/off
3. Set quiet hours (e.g., 22:00-06:00)

### F3. iOS Notification Setup

On iOS, notifications require permission:

1. When prompted, tap **Allow**
2. If you denied earlier: go to iPhone **Settings** → **SEKAR** → **Notifications** → Enable

---

## G. Profile & Settings

### G1. Viewing Your Profile

1. Tap the **Profile** icon (bottom-right or navigation drawer)
2. View:
   - Name, role, rayon, area(s)
   - Profile picture
   - Phone number
   - Account status

### G2. Updating Profile Picture

1. Tap your profile picture
2. Choose **Kamera** (take photo) or **Galeri** (choose existing)
3. Crop the image
4. Tap **Simpan**

### G3. Changing Password

1. Navigate to **Profile** → **Ubah Password**
2. Enter current password
3. Enter new password (minimum 8 characters)
4. Confirm new password
5. Tap **Simpan**

### G4. Biometric Settings (iOS, Phase 5)

1. Navigate to **Profile** → **Keamanan**
2. Toggle **Face ID** or **Touch ID**
3. Authenticate to confirm
4. Next app unlock will use biometrics

### G5. Language

The app interface is in **Bahasa Indonesia** by default. English localization is not included in Phase 5 scope.

---

## H. Troubleshooting

### H1. Cannot Login

| Problem | Solution |
|---------|----------|
| Wrong credentials | Check username/phone and password |
| Account locked | Contact admin_system |
| App crashes on login | Update to latest version |
| "Server tidak tersedia" | Check internet connection |

### H2. GPS Issues

| Problem | Solution |
|---------|----------|
| "Lokasi tidak tersedia" | Enable GPS in device settings |
| "Akurasi rendah" | Move to open area, wait 30 seconds |
| "Di luar area" but physically inside | Check GPS accuracy, report to supervisor |
| Battery drain | Normal during shift; background tracking optimized |

### H3. Photo Upload Issues

| Problem | Solution |
|---------|----------|
| Camera not working | Check camera permission in device settings |
| Photo upload stuck | Check internet; photo will auto-retry |
| "Ukuran foto terlalu besar" | Restart camera, app auto-compresses |

### H4. Sync Issues

| Problem | Solution |
|---------|----------|
| "Sinkronisasi gagal" | Pull to refresh, check internet |
| Pending items not clearing | Force close app, reopen |
| Old data showing | Pull to refresh on the screen |

### H5. App Performance

| Problem | Solution |
|---------|----------|
| App is slow | Close other apps, restart SEKAR |
| App crashes frequently | Update to latest version |
| High battery usage | Normal during active shift; close app after shift |
| High data usage | Disable auto-play (if any), use WiFi for reports |

### H6. iOS-Specific Issues (Phase 5)

| Problem | Solution |
|---------|----------|
| Apple Sign-In not working | Ensure signed into iCloud |
| Face ID not prompting | Check Settings → SEKAR → Face ID |
| Notifications not arriving | Settings → SEKAR → Notifications → Allow |
| Background location stops | Settings → SEKAR → Location → Always |

---

## I. Quick Reference

### I1. Key Actions by Role

| Action | satgas/linmas | korlap | kepala_rayon | admin |
|--------|:---:|:---:|:---:|:---:|
| Clock-in/out | ✅ | ✅ | ✅ | ❌ |
| Submit activities | ✅ | ✅ | ❌ | ❌ |
| Approve activities | ❌ | ✅ | ✅ | ❌ |
| Create tasks | ❌ | ✅ | ✅ | ✅ |
| View monitoring | ❌ | ✅ | ✅ | ✅ |
| View analytics | Own only | Team | Rayon | All |
| Generate reports | ❌ | ✅ | ✅ | ✅ |
| Manage assets | Borrow/return | + Maintenance | + All assets | + CRUD |
| Scan QR codes | ✅ | ✅ | ❌ | ❌ |

### I2. Bottom Navigation Tabs

| Role | Tabs (5-tab max; overflow in "Lainnya") | Visible |
|------|-------|-------|
| **satgas, linmas** | Beranda • Tugas • Aktivitas • Aset • Kinerja | Yes, no Profil tab visible |
| **korlap** | Beranda • Monitoring • Tugas • Lembur • Lainnya (Aktivitas, Aset, Tim, Laporan, Kinerja, Profil) | 6 tabs total, overflow to More |
| **admin_data** | Beranda • Monitoring • TasksAct • Aset • Lainnya (Laporan, Tim, Kinerja, Profil, PruningReview, PlantSeeds) | 6+ tabs, overflow to More |
| **kepala_rayon** | Beranda • Monitoring • Analitik • Laporan • Lainnya (Tugas, Lembur, Kinerja, Aset, Profil) | 5+ tabs, overflow to More |
| **top_management** | Beranda • Monitoring • Laporan • Tim • Lainnya (Analitik, PlantSeeds, Kinerja, Profil) | 4+ tabs, overflow to More |
| **admin_system, superadmin** | Same as top_management (read-only dashboards) | Similar overflow |

**Phase 5 additions:** "Aset" (all workers), "Kinerja" (worker performance), "Tim" (team analytics, korlap+), "Laporan" (korlap+), "Laporan" (admin+)

**Note:** "Profil" and "Lainnya" (More) are always accessible but not shown in main tab bar.

### I3. Status Icons

| Icon | Meaning |
|------|---------|
| 🟢 | Active / Online / Available |
| 🟡 | Inactive / Warning / In Progress |
| 🔴 | Outside Area / Error / Urgent |
| ⚫ | Missing / No Signal |
| ⚪ | Offline / Not Started |

---

**Last Updated:** 2026-03-13
