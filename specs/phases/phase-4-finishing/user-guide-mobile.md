# Phase 4: Mobile Application User Guide

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 Sub-Phases 4-1 through 4-5 Complete
**Related Sub-Phase:** 4-6
**Audience:** DLH Surabaya field workers and supervisors

---

## Current Codebase Facts (Post-Phase 3 Expected Values)

| Fact | Value |
|------|-------|
| Framework | React Native 0.83.x, React 19.x, Redux Toolkit |
| Screens | 30 (22 Phase 3 + 8 Phase 4) |
| Platforms | Android (Google Play), iOS (App Store, Phase 4) |
| Design System | Neo Brutalism (NB* components), WCAG 2.1 AA |
| Offline | SyncManager with queue-based sync |
| App Name | SEKAR - Sistem Evaluasi Kerja |

---

## A. Installation & Setup

### A1. Android Installation

1. Open **Google Play Store** on your Android device
2. Search for **"SEKAR DLH Surabaya"**
3. Tap **Install**
4. Wait for download and installation to complete
5. Tap **Open** to launch the app

> **Minimum Requirements:** Android 8.0 (Oreo) or later, 100 MB free storage.

### A2. iOS Installation (Phase 4)

1. Open **App Store** on your iPhone
2. Search for **"SEKAR Sistem Evaluasi Kerja"**
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

### A5. iOS-Specific: Apple Sign-In (Phase 4)

On iOS devices, an additional login option is available:

1. Tap **Sign in with Apple** button below the login form
2. Authenticate with Face ID or Touch ID
3. Choose to share or hide your email
4. Your Apple ID will be linked to your SEKAR account

> **First-time Apple Sign-In:** If your Apple ID is not yet linked to a SEKAR account, contact your admin to create one first, then link via Profile settings.

### A6. iOS-Specific: Biometric Login (Phase 4)

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

### B7. Viewing Your Performance (Phase 4)

1. Tap **Kinerja** in the navigation
2. View your performance dashboard:
   - Overall score (0-100) with grade (A/B/C/D)
   - Breakdown by category (attendance, tasks, activities, location)
   - 7-day attendance chart
   - Monthly task completion progress bar
3. Use the period selector to view different time ranges

### B8. Asset Management (Phase 4)

#### Borrowing an Asset

1. Tap **Aset** in the bottom navigation
2. Find the asset:
   - Browse the list, or
   - Tap the 📷 camera icon to **scan QR code**
3. Tap **Pinjam**
4. Select current condition
5. Add notes if needed
6. Tap **Konfirmasi**

#### Returning an Asset

1. Tap **Aset** → **Saya** tab
2. Find the asset to return
3. Tap **Kembalikan**
4. Select return condition
5. Add notes about any issues
6. Tap **Konfirmasi**

#### QR Code Scanning

1. Tap the 📷 icon on the Asset screen
2. Point your camera at the asset's QR code
3. The asset details appear automatically
4. If the QR code is damaged, tap **Ketik Kode Manual** and enter the asset code

> **Offline QR Scanning:** QR codes can be scanned offline. The asset info will load from cache if previously viewed, otherwise it will display the asset code for manual lookup when online.

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

### C6. Team Analytics (Phase 4)

1. Tap **Analitik** in the navigation
2. View team dashboard:
   - Summary cards (attendance, tasks, average score)
   - Top performers list
   - Needs attention list (low scores)
3. Tap a worker to see individual performance details
4. Use the area filter to compare areas (if multi-area korlap)

### C7. Reports (Phase 4)

1. Tap **Laporan** in the navigation
2. View generated reports with tabs:
   - **Harian** — Daily operations reports
   - **Mingguan** — Weekly performance
   - **Bulanan** — Monthly summary
3. Tap a report to preview
4. Tap **Unduh** to download PDF to device
5. Tap **+ Buat Laporan** to generate a custom report

### C8. Asset Management (Phase 4)

In addition to worker asset features, korlap can:

1. View all assets assigned to their area(s)
2. Schedule maintenance: **Aset** → asset detail → **+ Perawatan**
3. Complete maintenance records with actual work performed
4. View asset utilization and history

---

## D. Rayon Manager Guide (kepala_rayon)

### D1. Rayon Overview

As `kepala_rayon`, you see data for your entire rayon (multiple areas):

1. Home screen shows rayon-wide summary
2. Monitoring map covers all areas in your rayon
3. Analytics and reports are scoped to rayon level

### D2. Rayon Analytics (Phase 4)

1. Tap **Analitik**
2. View rayon-level dashboard:
   - Area comparison cards
   - Overall rayon performance score
   - Worker rankings across all areas
3. Drill down into specific areas by tapping area cards

### D3. Rayon Reports (Phase 4)

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

### G4. Biometric Settings (iOS, Phase 4)

1. Navigate to **Profile** → **Keamanan**
2. Toggle **Face ID** or **Touch ID**
3. Authenticate to confirm
4. Next app unlock will use biometrics

### G5. Language

The app interface is in **Bahasa Indonesia** by default. English localization is not included in Phase 4 scope.

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

### H6. iOS-Specific Issues (Phase 4)

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

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| satgas/linmas | Beranda | Tugas | Aktivitas | Aset | Profil |
| korlap | Beranda | Monitoring | Tugas | Lembur | Lainnya* |
| kepala_rayon | Beranda | Monitoring | Analitik | Laporan | Lainnya* |

*\* "Lainnya" (More) contains overflow tabs: Aktivitas, Aset, Laporan, Analitik, Profil*

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
