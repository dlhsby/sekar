# Phase 2B: Mobile Screen Specifications

**Last Updated:** February 5, 2026
**Total Screens:** 17
**Platform:** React Native 0.83.1 / React 19.2.4

This document provides complete specifications for all mobile application screens.

---

## Related Documents

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Phase overview, verification commands |
| [STATUS.md](./STATUS.md) | Progress tracking checklists |
| [components.md](./components.md) | Component specifications |
| [web.md](./web.md) | Web page specifications |
| [timeline.md](./timeline.md) | Implementation schedule |
| [design-tokens.md](../../mobile/design-tokens.md) | Complete mobile token reference |
| [component-library.md](../../mobile/component-library.md) | Mobile component library |

---

## Table of Contents

1. [Auth Stack](#auth-stack)
2. [Worker Stack](#worker-stack)
3. [Supervisor Stack](#supervisor-stack)
4. [Task Screens](#task-screens)
5. [Common Screens](#common-screens)

---

## Auth Stack

### Login Screen

```yaml
route: Login
file: fe/mobile/src/screens/auth/LoginScreen.tsx
compliance: 70%
priority: P1

layout:
  background: nbColors.background (#FDFD96)
  pattern: NBBackgroundPattern type=grid
  safe_area: true
  keyboard_avoiding: true
  scroll: KeyboardAwareScrollView

content:
  container:
    padding: 16
    justify: center
    min_height: screen height

  logo:
    size: 64
    border: nbBorders.base (2px)
    radius: nbBorderRadius.base (6px)
    shadow: nbShadows.sm
    margin_bottom: 16
    align: center

  title:
    text: "SEKAR"
    font: heading, 28, bold
    color: nbColors.black
    align: center

  subtitle:
    text: "Sistem Evaluasi Kinerja Satgas RTH"
    font: body, 14, regular
    color: nbColors.gray600
    align: center
    margin_bottom: 32

  form_card:
    component: NBCard
    padding: 24
    margin_horizontal: 0

  username_input:
    component: NBTextInput
    label: "Username"
    placeholder: "Masukkan username"
    icon_left: user
    autoCapitalize: none
    autoCorrect: false

  password_input:
    component: NBPasswordInput
    label: "Password"
    placeholder: "Masukkan password"
    icon_left: lock

  submit_button:
    component: NBButton
    variant: primary
    size: lg
    text: "Masuk"
    full_width: true
    margin_top: 24

error_state:
  component: NBAlert
  variant: error
  position: above inputs
  text: "Username atau password salah"
  haptic: notificationError

loading_state:
  button: loading spinner, disabled
  inputs: disabled

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBTextInput: border 3→2, radius 2→6
  - NBPasswordInput: inherits NBTextInput
  - NBButton: border 3→2, radius 2→6
  - All shadows: hard→soft

accessibility:
  - Form inputs have labels linked
  - Error announces via accessibilityLiveRegion
  - Submit button has clear accessibilityLabel
```

### Register Screen

```yaml
route: Register
file: fe/mobile/src/screens/auth/RegisterScreen.tsx
compliance: 70%
priority: P1

layout:
  inherits: Login Screen layout

content:
  title:
    text: "Daftar Akun"

  form_card:
    component: NBCard
    fields:
      - NBTextInput: fullName, label="Nama Lengkap"
      - NBTextInput: username
      - NBTextInput: email, keyboardType=email-address
      - NBTextInput: phone, keyboardType=phone-pad
      - NBPasswordInput: password
      - NBPasswordInput: confirmPassword

  submit_button:
    text: "Daftar"

  login_link:
    text: "Sudah punya akun? Masuk"
    onPress: navigate to Login

token_updates:
  - Same as Login Screen

accessibility:
  - Same as Login Screen
```

---

## Worker Stack

### Worker Home Screen

```yaml
route: WorkerHome
file: fe/mobile/src/screens/worker/WorkerHomeScreen.tsx
compliance: 70%
priority: P1

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16
  bottom_tab: true

header:
  component: NBHeader
  title: "Beranda"
  right_action: notifications icon with badge

content:
  greeting:
    text: "Selamat {timeOfDay}, {name}"
    font: heading, 24, bold

  status_card:
    component: NBCard
    variant: elevated
    content:
      icon: clock / check-circle
      status_text: "Belum Clock In" / "Sudah Clock In"
      last_clock: "Terakhir: {time} WIB"
      action_button:
        component: NBButton
        text: "Clock In" / "Clock Out"
        full_width: true

  today_tasks:
    title: "Tugas Hari Ini"
    font: heading, 18, semibold
    list:
      component: FlatList
      item:
        component: NBCard
        variant: interactive
        content:
          title: task.title
          area: task.area.name
          priority: NBBadge
          status: NBBadge
      empty:
        component: NBEmptyState
        icon: clipboard
        title: "Tidak ada tugas"
        description: "Anda belum memiliki tugas hari ini"

  quick_actions:
    display: row
    gap: 12
    items:
      - icon: file-plus
        label: "Buat Laporan"
        route: ReportSubmission
      - icon: map-pin
        label: "Lokasi"
        route: LocationTracking
      - icon: file-text
        label: "Riwayat"
        route: WorkReports

token_updates:
  - NBCard: border 3→2, radius 2→6, shadow soft
  - NBButton: border 3→2, radius 2→6
  - NBBadge: border 2→1, radius 2→4
  - NBEmptyState: border 3→2, radius 2→6

accessibility:
  - Status card has descriptive accessibilityLabel
  - Task items are accessible buttons
  - Quick actions have labels
```

### Clock In/Out Screen

```yaml
route: ClockInOut
file: fe/mobile/src/screens/worker/ClockInOutScreen.tsx
compliance: 75%
priority: P0

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Absensi"
  back_button: true

content:
  status_card:
    component: NBCard
    content:
      icon:
        name: clock / check-circle
        size: 48
        color: nbColors.gray500 / nbColors.primary
      status_text:
        text: "Belum Clock In" / "Sudah Clock In"
        font: heading, 20, bold
      last_time:
        text: "Terakhir: {time} WIB"
        font: body, 14
        color: nbColors.gray600

  camera_preview:
    container:
      height: 300
      border: nbBorders.base (2px)
      radius: nbBorderRadius.base (6px)
      overflow: hidden
      margin_vertical: 16
    camera:
      component: react-native-camera
      type: front
    overlay:
      guide_circle:
        size: 200
        border: 2px dashed white
        border_radius: 100
      instruction:
        text: "Posisikan wajah dalam lingkaran"
        color: white
        background: rgba(0,0,0,0.5)
        padding: 8

  location_card:
    component: NBCard
    content:
      icon: map-marker
      title: "Lokasi Terdeteksi"
      font: heading, 16, semibold
      location_name:
        text: "{area.name}"
        font: body, 14
      coordinates:
        text: "Lat: {lat}, Lng: {lng}"
        font: body, 12
        color: nbColors.gray600
    states:
      valid:
        border_color: nbColors.primary
        icon_color: nbColors.primary
      invalid:
        border_color: nbColors.danger
        icon_color: nbColors.danger
        warning_text: "Lokasi di luar area kerja"
      loading:
        component: NBSkeleton

  action_button:
    component: NBButton
    variant: primary
    size: lg
    text: "CLOCK IN" / "CLOCK OUT"
    full_width: true
    height: 56
    disabled_when:
      - location invalid
      - camera not ready
      - loading

states:
  loading_location:
    location_card: NBSkeleton
    button: disabled
  location_invalid:
    location_card: error state with warning
    button: disabled
    message: NBAlert variant=error
  camera_error:
    camera: error placeholder
    retry_button: visible
  submitting:
    button: loading spinner
    all: disabled

haptics:
  success: notificationSuccess
  error: notificationError

token_updates:
  - NBCard: border 3→2, radius 2→6, shadow soft
  - NBButton: border 3→2, radius 2→6
  - Camera container: radius 2→6
  - NBAlert: border 3→2, radius 2→6

accessibility:
  - Camera: accessibilityLabel="Kamera untuk foto selfie"
  - Location: accessibilityHint="Pastikan GPS aktif"
  - Button: accessibilityLabel="Clock in sekarang" / "Clock out sekarang"
  - Status: accessibilityLiveRegion="polite"
```

### Report Submission Screen

```yaml
route: ReportSubmission
file: fe/mobile/src/screens/worker/ReportSubmissionScreen.tsx
compliance: 70%
priority: P1

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Buat Laporan"
  back_button: true

form:
  area_selector:
    component: NBCard
    variant: interactive
    content:
      label: "Area Kerja"
      value: "{selectedArea.name}" / "Pilih area"
      icon_right: chevron-right
    onPress: show area picker modal

  description:
    component: NBTextInput (multiline)
    label: "Deskripsi Pekerjaan"
    placeholder: "Jelaskan pekerjaan yang dilakukan..."
    min_height: 120
    max_length: 500

  photo_upload:
    label: "Foto Dokumentasi"
    font: body, 14, medium
    margin_bottom: 8
    grid:
      columns: 3
      gap: 8
    photo_item:
      aspect_ratio: 1
      border: nbBorders.base (2px)
      radius: nbBorderRadius.base (6px)
      actions:
        tap: preview
        long_press: delete
    add_button:
      icon: camera
      text: "Tambah Foto"
      max_photos: 5

  location:
    component: NBCard
    auto_detected: true
    content:
      icon: map-pin
      label: "Lokasi"
      value: "{currentLocation}"

  submit_button:
    component: NBButton
    variant: primary
    text: "Kirim Laporan"
    full_width: true

validation:
  required:
    - area
    - description (min 10 chars)
    - at least 1 photo
  error_display:
    component: NBAlert
    variant: error

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBTextInput: border 3→2, radius 2→6
  - Photo items: radius 2→6
  - NBButton: border 3→2, radius 2→6

accessibility:
  - All form fields have labels
  - Photo grid is navigable
  - Submit announces success/error
```

### Work Reports Screen

```yaml
route: WorkReports
file: fe/mobile/src/screens/worker/WorkReportsScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  padding: 16

header:
  component: NBHeader
  title: "Riwayat Laporan"
  back_button: true

filters:
  date_range:
    component: date picker
    default: this week

list:
  component: FlatList
  item:
    component: NBCard
    variant: interactive
    content:
      date:
        font: body, 12
        color: nbColors.gray600
      title:
        text: truncated description
        font: body, 14, medium
      area:
        font: body, 12
        color: nbColors.gray600
      status:
        component: NBBadge
        variants: pending/approved/rejected
      thumbnail:
        size: 48
        radius: nbBorderRadius.sm (4px)
    onPress: navigate to detail

  empty:
    component: NBEmptyState
    icon: file-text
    title: "Belum ada laporan"

  loading:
    component: NBSkeleton variant=card count=3

  pagination:
    type: infinite scroll
    loading_indicator: bottom

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBBadge: border 2→1, radius 2→4
  - Thumbnail: radius 2→4
  - NBEmptyState: border 3→2, radius 2→6
```

### Location Tracking Screen

```yaml
route: LocationTracking
file: fe/mobile/src/screens/worker/LocationTrackingScreen.tsx
compliance: 65%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  flex: 1

header:
  component: NBHeader
  title: "Pelacakan Lokasi"
  back_button: true

map:
  component: react-native-maps
  flex: 1
  initial_region: current location
  markers:
    - current_position:
        component: custom marker
        icon: worker avatar
        pulse: when tracking active
    - area_boundaries:
        type: polygon
        stroke: nbColors.primary
        fill: nbColors.primary/10

status_overlay:
  position: absolute bottom
  margin: 16
  component: NBCard
  content:
    tracking_status:
      icon: radio (pulsing when active)
      text: "Pelacakan Aktif" / "Pelacakan Nonaktif"
      font: body, 14, medium
    last_update:
      text: "Terakhir: {time}"
      font: body, 12
      color: nbColors.gray600
    toggle_button:
      component: NBButton
      text: "Mulai" / "Hentikan"
      variant: primary / destructive

legend:
  position: top-right
  items:
    - color: nbColors.primary
      label: "Area Kerja"
    - color: current marker
      label: "Posisi Anda"

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBButton: border 3→2, radius 2→6
  - Custom markers: NB styling

accessibility:
  - Map: accessibilityLabel="Peta lokasi"
  - Status: accessibilityLiveRegion="polite"
```

### Worker Profile Screen

```yaml
route: WorkerProfile
file: fe/mobile/src/screens/worker/WorkerProfileScreen.tsx
compliance: 75%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Profil"
  right_action: edit icon

content:
  avatar_section:
    align: center
    avatar:
      size: 96
      border: nbBorders.base (2px)
      radius: full
    name:
      font: heading, 24, bold
      margin_top: 12
    role:
      component: NBBadge
      variant: secondary
      text: "Satgas"
      margin_top: 8

  info_card:
    component: NBCard
    title: "Informasi Pribadi"
    items:
      - label: Username
        value: "{user.username}"
      - label: Email
        value: "{user.email}"
      - label: Telepon
        value: "{user.phone}"

  assignment_card:
    component: NBCard
    title: "Penugasan"
    items:
      - label: Rayon
        value: "{user.rayon.name}"
      - label: Area
        value: "{user.area.name}"
      - label: Koordinator
        value: "{user.supervisor.name}"

  stats_card:
    component: NBCard
    title: "Statistik Bulan Ini"
    grid: 2 columns
    items:
      - value: "{attendanceRate}%"
        label: Kehadiran
      - value: "{reportCount}"
        label: Laporan
      - value: "{taskCompleted}"
        label: Tugas Selesai
      - value: "{rating}"
        label: Rating

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBBadge: border 2→1, radius 2→4
  - Avatar: border 2→2 (keep)
```

---

## Supervisor Stack

### Supervisor Map Dashboard

```yaml
route: SupervisorMap
file: fe/mobile/src/screens/supervisor/SupervisorMapScreen.tsx
compliance: 60%
priority: P1

layout:
  background: nbColors.background
  safe_area: true
  flex: 1

header:
  component: NBHeader
  title: "Pantau Pekerja"

map:
  component: react-native-maps
  flex: 1
  markers:
    workers:
      component: custom NBMarker
      avatar: worker photo
      border: nbBorders.base (2px)
      status_indicator:
        size: 12
        colors:
          online: nbColors.successBorder (#7FBC8C)
          offline: nbColors.danger (#FF6B6B)
          idle: nbColors.warning (#FFDB58)
    areas:
      type: polygon
      stroke: nbColors.primary
      fill: nbColors.primary/10
  clusters:
    enabled: true
    styling:
      border: nbBorders.base
      radius: full
      background: nbColors.primary

bottom_sheet:
  component: sliding panel
  collapsed_height: 80
  expanded_height: 50%
  content:
    summary:
      display: row
      items:
        - value: "{online}"
          label: "Online"
          color: success
        - value: "{offline}"
          label: "Offline"
          color: danger
        - value: "{total}"
          label: "Total"
    worker_list:
      component: FlatList
      item:
        avatar: 40
        name: font medium
        area: font small, gray
        status_dot: colored indicator
        onPress: center map on worker

legend:
  position: absolute top-right
  margin: 16
  component: NBCard
  compact: true
  items:
    - dot: green, label: "Online"
    - dot: red, label: "Offline"
    - dot: yellow, label: "Idle"

token_updates:
  - Marker borders: 3→2
  - Marker radius: 2→6
  - NBCard: border 3→2, radius 2→6
  - Legend card: compact styling

accessibility:
  - Each marker: accessibilityLabel="{name}, status {status}"
  - Legend: accessible
  - List items: accessible buttons
```

### Supervisor Reports Screen

```yaml
route: SupervisorReports
file: fe/mobile/src/screens/supervisor/SupervisorReportsScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  padding: 16

header:
  component: NBHeader
  title: "Laporan Pekerja"

filters:
  component: horizontal scroll
  items:
    - NBTab: "Semua"
    - NBTab: "Pending"
    - NBTab: "Reviewed"
    - NBTab: "Rejected"

search:
  component: NBTextInput
  placeholder: "Cari pekerja atau area..."
  icon_left: search

list:
  component: FlatList
  item:
    component: NBCard
    variant: interactive
    content:
      worker:
        avatar: 40
        name: font medium
      report:
        date: font small gray
        description: truncated
        area: font small
      status:
        component: NBBadge
      thumbnail:
        size: 48
        count: +{more}
    onPress: navigate to detail

token_updates:
  - NBTab: border 3→2, radius 2→6
  - NBTextInput: border 3→2, radius 2→6
  - NBCard: border 3→2, radius 2→6
  - NBBadge: border 2→1, radius 2→4
```

### Supervisor Report Detail Screen

```yaml
route: SupervisorReportDetail
file: fe/mobile/src/screens/supervisor/SupervisorReportDetailScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Detail Laporan"
  back_button: true

content:
  worker_card:
    component: NBCard
    content:
      avatar: 48
      name: font heading
      role: NBBadge
      area: font small gray

  report_card:
    component: NBCard
    sections:
      description:
        title: "Deskripsi"
        content: full description
      photos:
        title: "Foto Dokumentasi"
        grid: 2 columns
        onPress: full screen viewer
      location:
        title: "Lokasi"
        map: small preview
        coordinates: text
      timestamp:
        submitted: datetime
        status_history: list

  status_card:
    component: NBCard
    current_status:
      component: NBBadge
      size: lg

  actions:
    display: row
    gap: 12
    items:
      - NBButton: variant=destructive, text="Tolak"
      - NBButton: variant=primary, text="Setujui"

rating_input:
  visible_when: approving
  component: star rating (1-5)

rejection_reason:
  visible_when: rejecting
  component: NBTextInput multiline

token_updates:
  - All NBCard: border 3→2, radius 2→6
  - All NBButton: border 3→2, radius 2→6
  - All NBBadge: border 2→1, radius 2→4
```

### Supervisor Attendance Screen

```yaml
route: SupervisorAttendance
file: fe/mobile/src/screens/supervisor/SupervisorAttendanceScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  padding: 16

header:
  component: NBHeader
  title: "Kehadiran"

date_selector:
  component: horizontal date picker
  selected_style:
    background: nbColors.primary
    text: white
    border: nbBorders.base
    radius: nbBorderRadius.base

summary_card:
  component: NBCard
  display: row
  items:
    - value: "{present}"
      label: "Hadir"
      color: success
    - value: "{absent}"
      label: "Tidak Hadir"
      color: danger
    - value: "{late}"
      label: "Terlambat"
      color: warning

list:
  component: SectionList
  sections:
    - title: "Hadir"
    - title: "Tidak Hadir"
    - title: "Terlambat"
  item:
    component: NBCard
    content:
      avatar: 40
      name: font medium
      area: font small gray
      time: clock in/out times
      status_indicator: colored left border

token_updates:
  - Date picker: border 3→2, radius 2→6
  - NBCard: border 3→2, radius 2→6
```

---

## Task Screens

### Task Detail Screen

```yaml
route: TaskDetail
file: fe/mobile/src/screens/tasks/TaskDetailScreen.tsx
compliance: 70%
priority: P1

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Detail Tugas"
  back_button: true

content:
  status_badges:
    display: row
    gap: 8
    items:
      - NBBadge: priority (Low/Medium/High/Urgent)
      - NBBadge: status (Pending/In Progress/Completed)

  title:
    font: heading, 24, bold
    margin_top: 12

  info_card:
    component: NBCard
    items:
      - icon: map-pin
        label: "Area"
        value: "{task.area.name}"
      - icon: user
        label: "Ditugaskan ke"
        value: "{task.assignee.name}"
      - icon: calendar
        label: "Deadline"
        value: "{task.deadline}"
      - icon: clock
        label: "Dibuat"
        value: "{task.createdAt}"

  description_card:
    component: NBCard
    title: "Deskripsi"
    content: "{task.description}"

  checklist_card:
    component: NBCard
    title: "Checklist"
    items:
      - checkbox: styled
        text: item text
        strike_through: when completed
    progress:
      text: "{completed}/{total} selesai"
      bar: progress indicator

  action_buttons:
    display: column
    gap: 12
    items:
      - NBButton: variant=primary, text="Mulai Tugas" (if pending)
      - NBButton: variant=primary, text="Selesaikan Tugas" (if in progress)
      - NBButton: variant=outline, text="Batalkan" (if not completed)

token_updates:
  - NBBadge: border 2→1, radius 2→4
  - NBCard: border 3→2, radius 2→6
  - NBButton: border 3→2, radius 2→6
  - Checkbox: NB styling

accessibility:
  - Priority badge: accessibilityLabel="Prioritas {level}"
  - Status badge: accessibilityLabel="Status {status}"
  - Checklist items: accessibilityRole="checkbox"
```

### Task Complete Screen

```yaml
route: TaskComplete
file: fe/mobile/src/screens/tasks/TaskCompleteScreen.tsx
compliance: 70%
priority: P1

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Selesaikan Tugas"
  back_button: true

form:
  notes:
    component: NBTextInput (multiline)
    label: "Catatan Penyelesaian"
    placeholder: "Jelaskan hasil pekerjaan..."
    min_height: 100

  photo_upload:
    label: "Foto Bukti"
    grid: 3 columns
    gap: 8
    max_photos: 5
    add_button:
      icon: camera
      border: nbBorders.base dashed
      radius: nbBorderRadius.base

  checklist_review:
    component: NBCard
    title: "Review Checklist"
    items: completed items with checkmarks

submit_section:
  submit_button:
    component: NBButton
    variant: primary
    text: "Selesaikan Tugas"
    full_width: true

success_state:
  component: NBAlert
  variant: success
  icon: check-circle
  title: "Tugas Selesai!"
  description: "Tugas telah berhasil diselesaikan"
  haptic: notificationSuccess

token_updates:
  - NBTextInput: border 3→2, radius 2→6
  - Photo items: radius 2→6
  - NBCard: border 3→2, radius 2→6
  - NBButton: border 3→2, radius 2→6
  - NBAlert: border 3→2, radius 2→6
```

### Tasks Reports Screen

```yaml
route: TasksReports
file: fe/mobile/src/screens/tasks/TasksReportsScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  padding: 16

header:
  component: NBHeader
  title: "Riwayat Tugas"

filters:
  component: NBTab row
  items:
    - "Semua"
    - "Pending"
    - "In Progress"
    - "Completed"

list:
  component: FlatList
  item:
    component: NBCard
    variant: interactive
    content:
      title: font medium
      area: font small gray
      badges:
        - priority
        - status
      deadline: font small
    onPress: navigate to detail

  empty:
    component: NBEmptyState
    icon: clipboard
    title: "Tidak ada tugas"

token_updates:
  - NBTab: border 3→2, radius 2→6, + tablist role
  - NBCard: border 3→2, radius 2→6
  - NBBadge: border 2→1, radius 2→4
  - NBEmptyState: border 3→2, radius 2→6
```

---

## Common Screens

### Notifications Screen

```yaml
route: Notifications
file: fe/mobile/src/screens/common/NotificationsScreen.tsx
compliance: 70%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  padding: 16

header:
  component: NBHeader
  title: "Notifikasi"
  right_action:
    text: "Tandai Semua Dibaca"
    onPress: mark all read

list:
  component: FlatList
  item:
    component: NBCard
    variant: default / interactive
    unread_indicator:
      dot: left side
      background: slightly darker when unread
    content:
      icon: notification type icon
      title: font medium
      message: font small, 2 lines max
      time: font small gray
    onPress: navigate / mark read

  sections:
    - title: "Hari Ini"
    - title: "Kemarin"
    - title: "Lebih Lama"

  empty:
    component: NBEmptyState
    icon: bell
    title: "Tidak ada notifikasi"

notification_types:
  task_assigned:
    icon: clipboard
    color: nbColors.info
  report_approved:
    icon: check-circle
    color: nbColors.success
  report_rejected:
    icon: x-circle
    color: nbColors.danger
  shift_reminder:
    icon: clock
    color: nbColors.warning

token_updates:
  - NBCard: border 3→2, radius 2→6
  - NBEmptyState: border 3→2, radius 2→6
```

### Settings Screen

```yaml
route: Settings
file: fe/mobile/src/screens/common/SettingsScreen.tsx
compliance: 65%
priority: P2

layout:
  background: nbColors.background
  safe_area: true
  scroll: true
  padding: 16

header:
  component: NBHeader
  title: "Pengaturan"

sections:
  account:
    component: NBCard
    title: "Akun"
    items:
      - icon: user
        label: "Edit Profil"
        type: navigate
      - icon: lock
        label: "Ubah Password"
        type: navigate

  notifications:
    component: NBCard
    title: "Notifikasi"
    items:
      - icon: bell
        label: "Push Notification"
        type: toggle
        value: enabled/disabled
      - icon: volume-2
        label: "Suara"
        type: toggle
      - icon: vibrate
        label: "Getar"
        type: toggle

  app:
    component: NBCard
    title: "Aplikasi"
    items:
      - icon: globe
        label: "Bahasa"
        type: navigate
        value: "Indonesia"
      - icon: info
        label: "Tentang"
        type: navigate
      - icon: file-text
        label: "Kebijakan Privasi"
        type: navigate

  danger:
    component: NBCard
    title: "Zona Bahaya"
    items:
      - icon: log-out
        label: "Keluar"
        type: button
        variant: destructive

toggle_component:
  track:
    width: 48
    height: 28
    border: nbBorders.base (2px)
    radius: full
    off_bg: nbColors.gray300
    on_bg: nbColors.primary
  thumb:
    size: 22
    border: nbBorders.base
    radius: full
    background: white
  accessibility:
    accessibilityRole: "switch"
    accessibilityState: { checked: isOn }

token_updates:
  - NBCard: border 3→2, radius 2→6
  - Toggle: NB styling with role="switch"
```
