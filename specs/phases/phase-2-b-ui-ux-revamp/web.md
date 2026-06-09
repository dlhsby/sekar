# Phase 2B: Web Page Specifications

**Last Updated:** February 5, 2026
**Total Pages:** 22
**Platform:** Next.js 16.1.6 / React 19.2.3

This document provides complete specifications for all web dashboard pages.

---

## Related Documents

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Phase overview, verification commands |
| [STATUS.md](./STATUS.md) | Progress tracking checklists |
| [components.md](./components.md) | Component specifications |
| [mobile.md](./mobile.md) | Mobile screen specifications |
| [timeline.md](./timeline.md) | Implementation schedule |

---

## Table of Contents

1. [Authentication Pages](#authentication-pages)
2. [Dashboard Pages](#dashboard-pages)
3. [Areas Pages](#areas-pages)
4. [Rayons Pages](#rayons-pages)
5. [Tasks Pages](#tasks-pages)
6. [Reports Pages](#reports-pages)
7. [Monitoring Page](#monitoring-page)
8. [Users Pages](#users-pages)
9. [Schedules Pages](#schedules-pages)
10. [Settings Page](#settings-page)
11. [Layout Components](#layout-components)

---

## Authentication Pages

### Login Page

```yaml
route: /login
file: fe/web/src/app/(auth)/login/page.tsx
compliance: 85%
priority: P1

layout:
  background: bg-nb-background (#FDFD96)
  pattern: grid (3% opacity)
  content: centered

card:
  max_width: max-w-md (420px)
  padding: p-12 (48px)
  border: border-2 border-nb-black
  radius: rounded-nb-md (8px)
  shadow: shadow-nb-lg

components:
  logo:
    size: w-20 h-20
    border: border-2 border-nb-black
    radius: rounded-nb-base
    shadow: shadow-nb-sm

  title:
    text: "SEKAR"
    font: text-3xl font-bold font-heading
    color: text-nb-black

  subtitle:
    text: "Sistem Evaluasi Kinerja Satgas RTH"
    font: text-base
    color: text-nb-gray-600

  username_input:
    component: NBFormInput
    label: "Username"
    placeholder: "Masukkan username"
    icon_left: User

  password_input:
    component: NBFormInput
    type: password
    label: "Password"
    placeholder: "Masukkan password"
    icon_left: Lock

  submit_button:
    component: NBButton
    variant: primary
    text: "Masuk"
    full_width: true
    height: h-13 (52px)

error_state:
  type: banner
  position: above form
  background: bg-nb-danger-light
  border: border-2 border-nb-danger
  radius: rounded-nb-base
  icon: AlertCircle
  message: "Username atau password salah"
  accessibility: aria-live="polite"

issues:
  - Missing focus ring styling on submit
  - Error message needs aria-live="polite"

actions:
  - Apply NBFormInput token updates
  - Add aria-live to error region
  - Verify focus ring styling
```

---

## Dashboard Pages

### Dashboard Home

```yaml
route: /
file: fe/web/src/app/(dashboard)/page.tsx
compliance: 80%
priority: P1

layout:
  background: bg-nb-gray-50
  max_width: max-w-7xl mx-auto
  padding: p-6

sections:
  greeting:
    title:
      text: "Selamat datang, {user.fullName}"
      font: text-3xl font-bold font-heading
    subtitle:
      text: "Berikut ringkasan aktivitas hari ini"
      font: text-base
      color: text-nb-gray-600

  stats_grid:
    display: grid
    columns: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
    gap: gap-6

  stat_card:
    component: NBCard
    variant: elevated
    structure:
      icon:
        size: w-12 h-12
        background: bg-nb-primary/10
        radius: rounded-nb-base
      title:
        font: text-sm font-medium
        color: text-nb-gray-600
      value:
        font: text-3xl font-bold
        color: text-nb-black
      badge:
        component: NBBadge
        variant: success/info

  stat_cards:
    - title: "Pekerja Aktif"
      icon: Users
      badge: "{online} online"
    - title: "Laporan Hari Ini"
      icon: FileText
      badge_variant: success
    - title: "Kehadiran"
      icon: CheckCircle
      value: "{percentage}%"
    - title: "Area Aktif"
      icon: MapPin

  quick_actions:
    display: grid
    columns: grid-cols-1 md:grid-cols-3
    gap: gap-6

  action_card:
    component: NBCard
    variant: interactive
    structure:
      icon:
        size: w-10 h-10
        color: text-nb-primary
      title:
        font: text-lg font-semibold
      description:
        font: text-sm
        color: text-nb-gray-600

issues:
  - Missing aria-label on stat card icons
  - Section headers need proper heading hierarchy

actions:
  - Add aria-label to icon buttons
  - Ensure h1 > h2 > h3 hierarchy
  - Add aria-live for dynamic stat counts
```

---

## Areas Pages

### Areas List

```yaml
route: /areas
file: fe/web/src/app/(dashboard)/areas/page.tsx
compliance: 75%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Kelola Area"
  font: text-2xl font-bold
  actions:
    - component: NBButton
      text: "Tambah Area"
      icon: Plus
      route: /areas/new

content:
  component: NBDataTable
  columns:
    - Nama Area
    - Rayon
    - Koordinator
    - Jumlah Pekerja
    - Status
    - Aksi

  row_actions:
    - icon: Eye, label: Lihat
    - icon: Edit, label: Edit
    - icon: Trash, label: Hapus

issues:
  - Hardcoded widths: min-w-[200px], w-48
  - Inconsistent gap spacing
  - Table headers missing aria-sort

actions:
  - Replace hardcoded widths with responsive classes
  - Standardize gap using design tokens
  - Add aria-sort to sortable columns
```

### Area Detail

```yaml
route: /areas/[id]
file: fe/web/src/app/(dashboard)/areas/[id]/page.tsx
compliance: 70%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

breadcrumb:
  items:
    - text: Areas, route: /areas
    - text: "{area.name}"
  aria_label: "Navigasi breadcrumb"

content:
  grid: grid-cols-1 lg:grid-cols-3
  gap: gap-6

  info_card:
    component: NBCard
    span: lg:col-span-1
    sections:
      - label: Nama Area
        value: "{area.name}"
      - label: Rayon
        value: "{area.rayon.name}"
      - label: Koordinator
        value: "{area.coordinator.name}"
      - label: Jumlah Pekerja
        value: "{area.workerCount}"

  map_card:
    component: NBCard
    span: lg:col-span-2
    height: h-[500px]
    map:
      provider: Mapbox GL
      markers: area boundary
      controls: zoom, fullscreen

issues:
  - Map container h-[500px] hardcoded
  - Map missing alt text / aria-label
  - Breadcrumb missing aria-label

actions:
  - Use aspect-ratio or responsive height
  - Add aria-label="Peta area {name}"
  - Add aria-label to breadcrumb nav
```

### Area Edit

```yaml
route: /areas/[id]/edit
file: fe/web/src/app/(dashboard)/areas/[id]/edit/page.tsx
compliance: 80%
priority: P3

layout:
  max_width: max-w-4xl mx-auto
  padding: p-6

form:
  component: NBCard
  fields:
    - component: NBFormInput
      name: name
      label: "Nama Area"
      required: true
    - component: NBFormSelect
      name: rayonId
      label: "Rayon"
      required: true
    - component: NBFormSelect
      name: coordinatorId
      label: "Koordinator"

  actions:
    - component: NBButton
      variant: outline
      text: "Batal"
    - component: NBButton
      variant: primary
      text: "Simpan"

issues:
  - max-w-7xl hardcoded (should be design token)

actions:
  - Apply form component token updates
```

### Area New

```yaml
route: /areas/new
file: fe/web/src/app/(dashboard)/areas/new/page.tsx
compliance: 80%
priority: P3

# Same structure as Area Edit
inherits: Area Edit

issues:
  - Same as Area Edit

actions:
  - Same as Area Edit
```

---

## Rayons Pages

### Rayons List

```yaml
route: /rayons
file: fe/web/src/app/(dashboard)/rayons/page.tsx
compliance: 60%
priority: P1

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Kelola Rayon"
  font: text-2xl font-bold

content:
  display: grid
  columns: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  gap: gap-6

rayon_card:
  component: NBCard
  variant: interactive
  structure:
    header:
      title: "{rayon.name}"
      badge: "{rayon.areaCount} Area"
    body:
      stats:
        - label: Pekerja
          value: "{workerCount}"
        - label: Aktif
          value: "{activeCount}"
    footer:
      action: NBButton variant=outline text="Lihat Detail"

loading_state:
  component: NBSkeleton
  variant: card
  count: 6

issues:
  - Uses text-gray-600 instead of text-nb-gray-600
  - Loading spinner missing accessibility
  - Card stats use non-token colors

actions:
  - Replace all gray-* with nb-gray-*
  - Add aria-busy="true" to loading container
  - Update color tokens in card content
```

### Rayon Detail

```yaml
route: /rayons/[id]
file: fe/web/src/app/(dashboard)/rayons/[id]/page.tsx
compliance: 70%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

breadcrumb:
  items:
    - text: Rayons, route: /rayons
    - text: "{rayon.name}"

tabs:
  component: NBTabs (to be added)
  items:
    - label: Overview
    - label: Areas
    - label: Pekerja
    - label: Laporan

overview:
  grid: grid-cols-1 lg:grid-cols-2
  gap: gap-6

  stats_card:
    component: NBCard
    stats:
      - label: Total Area
        value: "{areaCount}"
      - label: Total Pekerja
        value: "{workerCount}"
      - label: Kehadiran Hari Ini
        value: "{attendanceRate}%"

  map_card:
    component: NBCard
    map: all areas in rayon

issues:
  - Breadcrumb missing aria-label
  - Hardcoded spacing values
  - Missing NBTabs component

actions:
  - Add aria-label="Navigasi breadcrumb"
  - Standardize spacing to design tokens
  - Create web NBTabs component
```

---

## Tasks Pages

### Tasks List

```yaml
route: /tasks
file: fe/web/src/app/(dashboard)/tasks/page.tsx
compliance: 75%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Kelola Tugas"
  actions:
    - component: NBButton
      text: "Tambah Tugas"
      icon: Plus

filters:
  display: flex
  gap: gap-4
  items:
    - component: NBSelect
      label: Status
      options: [Semua, Pending, In Progress, Completed]
    - component: NBSelect
      label: Prioritas
      options: [Semua, Low, Medium, High, Urgent]
    - component: NBInput
      type: search
      placeholder: "Cari tugas..."

stats:
  display: flex
  gap: gap-4
  items:
    - label: Total
      value: "{total}"
    - label: Pending
      value: "{pending}"
      color: warning
    - label: In Progress
      value: "{inProgress}"
      color: info
    - label: Completed
      value: "{completed}"
      color: success

table:
  component: NBDataTable
  columns:
    - Judul
    - Area
    - Pekerja
    - Prioritas (badge)
    - Status (badge)
    - Deadline
    - Aksi

issues:
  - Filter selects need aria-pressed for toggle states
  - Stat cards need aria-label

actions:
  - Add proper ARIA attributes to filters
  - Add aria-label to stat counters
```

### Task New

```yaml
route: /tasks/new
file: fe/web/src/app/(dashboard)/tasks/new/page.tsx
compliance: 65%
priority: P2

layout:
  max_width: max-w-4xl mx-auto
  padding: p-6

form:
  component: NBCard
  sections:
    basic_info:
      title: "Informasi Dasar"
      fields:
        - NBFormInput: title, required
        - NBFormTextarea: description
        - NBFormSelect: priority
        - NBFormInput: deadline, type=date

    assignment:
      title: "Penugasan"
      fields:
        - NBFormSelect: areaId
        - NBFormSelect: assigneeId

    checklist:
      title: "Checklist"
      dynamic: true
      item_fields:
        - NBFormInput: item text

  actions:
    - NBButton: variant=outline, text="Batal"
    - NBButton: variant=primary, text="Simpan"

error_display:
  position: top of form
  background: bg-nb-danger-light (NOT bg-red-100)
  border: border-2 border-nb-danger
  radius: rounded-nb-base

issues:
  - Uses bg-red-100 instead of bg-nb-danger-light
  - Hardcoded padding values

actions:
  - Replace bg-red-100 with bg-nb-danger-light
  - Use design token padding
```

---

## Reports Pages

### Reports List

```yaml
route: /reports
file: fe/web/src/app/(dashboard)/reports/page.tsx
compliance: 75%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Laporan Kerja"

filters:
  display: flex flex-wrap
  gap: gap-4
  items:
    - NBInput: type=search, placeholder="Cari laporan..."
    - NBSelect: status filter
    - NBInput: type=date, label="Dari"
    - NBInput: type=date, label="Sampai"
    - NBButton: text="Filter", variant=outline

table:
  component: NBDataTable
  columns:
    - ID
    - Pekerja
    - Area
    - Tanggal
    - Status (badge)
    - Rating
    - Aksi

pagination:
  component: NBPagination
  position: bottom
  aria_label: "Navigasi halaman laporan"

issues:
  - Date filter inputs need aria-label
  - Search needs aria-live for results count

actions:
  - Add aria-label to date inputs
  - Add aria-live region for search results
```

### Report Detail

```yaml
route: /reports/[id]
file: fe/web/src/app/(dashboard)/reports/[id]/page.tsx
compliance: 65%
priority: P1

layout:
  background: bg-nb-gray-50
  padding: p-6

breadcrumb:
  items:
    - text: Laporan, route: /reports
    - text: "Laporan #{id}"

content:
  grid: grid-cols-1 lg:grid-cols-3
  gap: gap-6

  info_card:
    component: NBCard
    span: lg:col-span-1
    sections:
      worker:
        avatar: w-16 h-16
        name: font-bold
        role: text-nb-gray-600
      details:
        - label: Area
          value: "{area.name}"
        - label: Tanggal
          value: "{date}"
        - label: Status
          value: NBBadge

  content_card:
    component: NBCard
    span: lg:col-span-2
    sections:
      description:
        title: "Deskripsi Pekerjaan"
        content: "{report.description}"
      photos:
        title: "Foto Dokumentasi"
        grid: grid-cols-2 md:grid-cols-3
        gap: gap-4
        image:
          border: border-2
          radius: rounded-nb-base
          aspect: aspect-square
          object_fit: object-cover
          alt: "Foto dokumentasi laporan"

  location_card:
    component: NBCard
    sections:
      gps:
        icon: MapPin
        label: "Lokasi GPS"
        value: "{lat}, {lng}"
        aria_label: "Koordinat GPS: latitude {lat}, longitude {lng}"
      map:
        height: h-48
        provider: Mapbox GL
        marker: report location

issues:
  - Photos missing alt text (CRITICAL)
  - GPS coordinates need aria-label

actions:
  - Add alt="Foto dokumentasi {index}" to all photos
  - Add descriptive aria-label to GPS section
```

---

## Monitoring Page

```yaml
route: /monitoring
file: fe/web/src/app/(dashboard)/monitoring/page.tsx
compliance: 55%
priority: P0

layout:
  background: bg-nb-gray-50
  padding: p-6
  height: h-screen (minus header)

header:
  title: "Monitoring Real-Time"
  subtitle: "Pantau lokasi dan status pekerja"
  refresh_indicator:
    type: pulse
    color: bg-nb-primary
    aria_label: "Data diperbarui otomatis"

content:
  grid: grid-cols-1 lg:grid-cols-4
  gap: gap-6

  sidebar:
    span: lg:col-span-1
    sections:
      stats:
        - label: Online
          value: "{count}"
          indicator: green dot
        - label: Offline
          value: "{count}"
          indicator: red dot
        - label: Idle
          value: "{count}"
          indicator: yellow dot

      worker_list:
        component: scrollable list
        item:
          avatar: w-10 h-10
          name: font-medium
          status_dot:
            size: w-3 h-3
            colors:
              online: bg-nb-success-border
              offline: bg-nb-danger
              idle: bg-nb-warning
            aria_label: "Status: {status}"

  map:
    span: lg:col-span-3
    component: NBCard
    height: h-full
    map:
      provider: Mapbox GL
      markers: worker locations
      clusters: enabled
      controls: zoom, fullscreen, layers

legend:
  position: bottom-left of map
  items:
    - color: green, label: Online
    - color: red, label: Offline
    - color: yellow, label: Idle

websocket:
  events:
    - worker_location_update
    - worker_status_change
  aria_live: "polite" for status changes

issues:
  - Status dots missing aria-label (CRITICAL)
  - No aria-live for real-time updates
  - Legend missing keyboard access

actions:
  - Add aria-label="Status {status}" to all dots
  - Add aria-live="polite" region for updates
  - Make legend items accessible
```

---

## Users Pages

### Users List

```yaml
route: /users
file: fe/web/src/app/(dashboard)/users/page.tsx
compliance: 75%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Kelola Pengguna"
  actions:
    - NBButton: text="Tambah Pengguna", icon=Plus

filters:
  items:
    - NBInput: type=search
    - NBSelect: role filter
    - NBSelect: status filter

table:
  component: NBDataTable
  columns:
    - Avatar + Nama
    - Username
    - Role (badge)
    - Rayon/Area
    - Status (badge)
    - Aksi
  sortable:
    - Nama (aria-sort)
    - Username (aria-sort)
    - Role (aria-sort)

pagination:
  component: NBPagination
  aria_live: announce page changes

issues:
  - Table headers missing aria-sort
  - Pagination needs aria-live

actions:
  - Add aria-sort to sortable headers
  - Add aria-live to pagination region
```

### User New

```yaml
route: /users/new
file: fe/web/src/app/(dashboard)/users/new/page.tsx
compliance: 80%
priority: P3

layout:
  max_width: max-w-4xl mx-auto
  padding: p-6

form:
  component: NBCard
  sections:
    account:
      title: "Informasi Akun"
      fields:
        - NBFormInput: username, required
        - NBFormInput: email, type=email
        - NBFormInput: password, type=password
        - NBFormInput: confirmPassword, type=password

    profile:
      title: "Profil"
      fields:
        - NBFormInput: fullName, required
        - NBFormInput: phone
        - NBFormSelect: role, required
        - NBFormSelect: rayonId (if applicable)
        - NBFormSelect: areaId (if applicable)

  error_region:
    position: top
    aria_live: "polite"

  actions:
    - NBButton: variant=outline, text="Batal"
    - NBButton: variant=primary, text="Simpan"

issues:
  - Form error needs aria-live

actions:
  - Add aria-live="polite" to error region
```

### User Edit

```yaml
route: /users/[id]
file: fe/web/src/app/(dashboard)/users/[id]/page.tsx
compliance: 80%
priority: P3

# Similar to User New with pre-populated data

loading_state:
  component: NBSkeleton
  aria_label: "Memuat data pengguna"

issues:
  - Loading state needs aria-label

actions:
  - Add aria-label to loading skeleton
```

---

## Schedules Pages

### Schedules List

```yaml
route: /schedules
file: fe/web/src/app/(dashboard)/schedules/page.tsx
compliance: 75%
priority: P2

layout:
  background: bg-nb-gray-50
  padding: p-6

header:
  title: "Jadwal Shift"
  actions:
    - NBButton: text="Tambah Jadwal", icon=Plus

calendar_view:
  component: calendar grid
  week_view: 7 columns
  time_slots: rows

schedule_card:
  component: NBCard
  size: compact
  content:
    time: "07:00 - 15:00"
    worker: "{name}"
    area: "{area}"

dialog:
  component: NBDialog
  trigger: click on schedule card
  content:
    title: "Detail Jadwal"
    body: schedule information
    actions: Edit, Delete

issues:
  - Dialog missing aria-labelledby

actions:
  - Add aria-labelledby linking to dialog title
```

### Schedule New

```yaml
route: /schedules/new
file: fe/web/src/app/(dashboard)/schedules/new/page.tsx
compliance: 65%
priority: P2

layout:
  max_width: max-w-4xl mx-auto
  padding: p-6

form:
  component: NBCard
  fields:
    - NBFormSelect: workerId, required
    - NBFormSelect: areaId, required
    - NBFormInput: date, type=date, required
    - NBFormSelect: shiftType (Pagi/Siang/Malam)
    - NBFormInput: startTime, type=time
    - NBFormInput: endTime, type=time

  helper_text:
    position: below fields
    color: text-nb-gray-600 (NOT hardcoded)

  error:
    background: bg-nb-danger-light (NOT bg-red-50)

issues:
  - Uses bg-red-50 instead of token
  - Helper text color hardcoded

actions:
  - Replace bg-red-50 with bg-nb-danger-light
  - Use design token for helper text color
```

### Schedule Edit

```yaml
route: /schedules/[id]/edit
file: fe/web/src/app/(dashboard)/schedules/[id]/edit/page.tsx
compliance: 65%
priority: P2

# Same structure as Schedule New
inherits: Schedule New

issues:
  - Same as Schedule New

actions:
  - Same as Schedule New
```

---

## Settings Page

```yaml
route: /settings
file: fe/web/src/app/(dashboard)/settings/page.tsx
compliance: 60%
priority: P0

layout:
  background: bg-nb-gray-50
  padding: p-6
  max_width: max-w-4xl mx-auto

sections:
  profile:
    component: NBCard
    title: "Profil"
    fields:
      - Avatar upload
      - NBFormInput: fullName
      - NBFormInput: email
      - NBFormInput: phone

  preferences:
    component: NBCard
    title: "Preferensi"
    items:
      - toggle: Notifikasi Email
      - toggle: Notifikasi Push
      - toggle: Dark Mode (future)
      - select: Bahasa

  security:
    component: NBCard
    title: "Keamanan"
    items:
      - button: Ubah Password
      - toggle: Two-Factor Auth (future)

toggle_component:
  structure:
    label: text-left
    toggle: right-aligned
  styling:
    track:
      width: w-12
      height: h-6
      border: border-2
      radius: rounded-full
      off: bg-nb-gray-300
      on: bg-nb-primary
    thumb:
      size: w-5 h-5
      border: border-2
      radius: rounded-full
      background: bg-white
      translate: on state moves right

issues:
  - Toggle missing role="switch" (CRITICAL)
  - Toggle missing aria-checked
  - Hardcoded dimensions

actions:
  - Add role="switch" to all toggles
  - Add aria-checked={isOn}
  - Use design tokens for dimensions
```

---

## Layout Components

### Dashboard Layout

```yaml
file: fe/web/src/app/(dashboard)/layout.tsx
compliance: 85%
priority: P2

structure:
  sidebar:
    component: NBSidebar
    width: w-60
    collapsible: true
  main:
    margin_left: ml-60 (when sidebar open)
    transition: transition-all

header:
  height: h-16
  background: bg-white
  border: border-b-2 border-nb-black
  content:
    hamburger:
      display: lg:hidden
      icon: Menu
      aria_label: "Toggle navigation"
    breadcrumb:
      display: hidden lg:flex
    user_menu:
      component: NBDropdownMenu
      trigger: avatar + name
      items: Profile, Settings, Logout

sidebar_toggle:
  desktop:
    icon: ChevronLeft / ChevronRight
    aria_expanded: "{isOpen}"
    aria_label: "Toggle sidebar"

issues:
  - Sidebar toggle needs aria-expanded

actions:
  - Add aria-expanded to sidebar toggle button
```

### Root Layout

```yaml
file: fe/web/src/app/layout.tsx
compliance: 95%
priority: P3

html:
  lang: "id" ✅ (already set)
  className: font-body

head:
  title: "SEKAR - DLH Surabaya"
  meta:
    description: "Sistem Evaluasi Kinerja Satgas RTH"
    viewport: "width=device-width, initial-scale=1"

body:
  className: bg-nb-background text-nb-black
  min_height: min-h-screen

providers:
  - AuthProvider
  - QueryClientProvider
  - ToastProvider

issues:
  - None significant

actions:
  - Verify font loading
```
