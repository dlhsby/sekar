# Maestro E2E Test Suite — SEKAR Mobile App

## Overview

This directory contains 19 Maestro YAML flows covering Phase 4-9 scenarios for the SEKAR mobile app (React Native 0.83). Flows test authentication, onboarding, core field-worker features (clock-in/out, activities, tasks), coordinator functions (reassignment), external users (pruning requests), and Phase 5 features (assets, reporting, analytics).

**appId:** `com.wahyutrip.sekar`

---

## Flow Inventory

| # | Flow | Scenario | Tags | Device Needs |
|---|------|----------|------|--------------|
| 01 | `01-welcome-carousel.yaml` | First-launch carousel; swipe 5 slides, skip, enter login | smoke, entry | Basic |
| 02 | `02-login-success.yaml` | Valid login (satgas1) → home screen | smoke, auth | Basic |
| 03 | `03-login-validation.yaml` | Empty fields, bad password, per-field errors + toast | smoke, auth | Basic |
| 04 | `04-forgot-password.yaml` | Login → "Lupa Sandi" → contact-admin screen (AS-4) | auth, manual-intent | Basic |
| 05 | `05-change-password-forced.yaml` | Password_must_change → ChangePasswordScreen → success → home | auth | Basic |
| 06 | `06-onboarding-first-launch.yaml` | First login → OB-1 → OB-2 (all perms) → OB-3 → home | onboarding, perms | Perms |
| 07 | `07-onboarding-skip-perms.yaml` | OB-2 with declined perms; verify feature-gating | onboarding | Perms |
| 08 | `08-notifications-inbox.yaml` | Bell badge → inbox, filter chips, mark-read | notifications | Basic |
| 09 | `09-clock-in-out.yaml` | Clock in (selfie + GPS) → shift timer → clock out | core, field | GPS + Camera |
| 10 | `10-activity-submit.yaml` | Create activity with photo + description → submit | core, field | Camera |
| 11 | `11-task-complete.yaml` | Open task → complete with notes | core, field | Basic |
| 12 | `12-overtime-request.yaml` | Start overtime → submit with notes | core, field | Basic |
| 13 | `13-reassign-worker.yaml` | Korlap/kepala_rayon reassign worker to new area | coordinator | Basic |
| 14 | `14-pruning-kecamatan.yaml` | staff_kecamatan submits pruning request (GPS, photos, tree details) | kecamatan | GPS + Camera |
| 15 | `15-offline-sync.yaml` | Queue action offline → reconnect → verify sync | offline | Device Control |
| 16 | `16-assets-browse-checkout.yaml` | Browse assets, filter by availability, open detail, checkout (borrow) asset | assets, phase-5, field | Basic |
| 17 | `17-reports-view.yaml` | Open Reports tab, apply status/type filters, view report detail | reports, phase-5, admin | Basic |
| 18 | `18-analytics-worker.yaml` | Field worker opens Kinerja tab, views own performance score, KPIs, attendance trend | analytics, phase-5, worker | Basic |
| 19 | `19-analytics-team.yaml` | Coordinator opens Tim tab, views team summary, top performers, needs attention list | analytics, phase-5, team | Basic |

---

## Running the Tests

### Prerequisites

1. **Backend running:**
   ```bash
   cd apps/be/
   npm run db:seed:staging  # or db:seed for full reset
   npm run start:dev
   ```
   Backend must be reachable from the device/emulator.

2. **Mobile .env configured:**
   ```bash
   cd apps/mobile/
   cp .env.local.example .env.local
   # Set API_BASE_URL for emulator (http://10.0.2.2:3000) or device (http://<your-ip>:3000)
   npm install
   ```

3. **APK built (CI) or app installed (manual device):**
   ```bash
   # Debug APK for CI
   cd android && ./gradlew assembleDebug && cd ..
   
   # Or install on real device
   npm run android
   ```

4. **Maestro CLI installed (local testing):**
   ```bash
   brew install maestro  # or download from maestro.mobile
   ```

### Running Locally

```bash
# All flows
maestro test .maestro/flows/

# Single flow
maestro test .maestro/flows/02-login-success.yaml

# Smoke tests only (quick validation)
maestro test \
  .maestro/flows/01-welcome-carousel.yaml \
  .maestro/flows/02-login-success.yaml \
  .maestro/flows/03-login-validation.yaml

# With retry and debug output
maestro test \
  --retry-count=2 \
  --debug-output=./artifacts \
  .maestro/flows/
```

### Running in CI

Configured via GitHub Actions workflow (`.github/workflows/mobile-e2e.yml`):

```yaml
- name: Start backend
  run: |
    cd be && npm install && npm run db:seed:staging && npm run start:dev &

- name: Build APK
  run: cd apps/mobile && npm install && ./android/gradlew assembleDebug

- name: Run Maestro tests
  run: |
    maestro test \
      --retry-count=2 \
      --debug-output=./artifacts \
      apps/mobile/.maestro/flows/

- name: Upload artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: maestro-artifacts
    path: artifacts/
```

**Trigger:** Push to `main` + `workflow_dispatch` (per ADR-017)
**Runner:** Ubuntu (supports KVM for Android emulation)
**Duration:** ~8-10 min (emulator boot + 15 flows)

---

## Selector Strategy

### Approach

Flows prioritize **testID selectors** (`id:` in Maestro) where they exist in the app code, falling back to **visible Indonesian text** for UI elements without testIDs.

**Why:**
- TestIDs are deterministic and don't depend on language or UI layout changes.
- Visible text matches actual user experience and catches translation issues.

### Key TestIDs Used

| Screen | TestID | Purpose |
|--------|--------|---------|
| WelcomeCarouselScreen | `welcome-carousel-screen` | Root testID |
| | `carousel-slide-{WL-2..WL-5}` | Individual slides |
| | `carousel-primary` / `carousel-skip` | Buttons |
| LoginScreen | `username-input` / `password-input` | Form fields |
| | `login-button` / `forgot-password-link` | Actions |
| ForgotPasswordScreen | `forgot-password-screen` | Root |
| | `forgot-wa` / `forgot-tel` | Contact buttons |
| | `forgot-password-back` | Return to login |
| ChangePasswordScreen | `change-password-screen` | Root |
| | `change-password-new` / `change-password-confirm` | Inputs |
| | `change-password-rules` | Requirement checklist |
| | `change-password-submit` / `change-password-logout` | Actions |
| | `change-password-success` | Success overlay |
| OnboardingWelcomeScreen | `onboarding-welcome-screen` | Root |
| | `onboarding-welcome-continue` | Continue button |
| OnboardingPermissionsScreen | `perm-row-{key}` | Permission rows (key: notifications, location, etc.) |
| | `perm-grant-{key}` / `perm-status-{key}` | Permission button + status badge |
| NotificationsScreen | `notification-row-{id}` | Notification list items |
| FieldHomeScreen | `absensi-card` / `absensi-clock-button` | Clock-in UI |
| ClockInOutScreen | (varies; uses text) | Relies on visible text (GPS, Selfie, Masuk, etc.) |
| ActivitySubmissionScreen | (uses text) | Uses visible text (Jenis, Deskripsi, Foto) |
| TasksActivityScreen | (uses text) | Uses tabs + list (Tugas, Aktivitas) |
| SubmitScreen (pruning) | `perantingan-pick-on-map` / `perantingan-pick-week` / `perantingan-submit-cta` | Pruning form fields + submit |
| | `perantingan-rayon-readonly` / `perantingan-kecamatan-readonly` | Read-only location fields |
| AssetListScreen (Phase 5-3) | (no testIDs; uses text) | Uses visible text (Aset, Cari aset, Semua, Tersedia, Saya, status badges) |
| AssetDetailScreen | (no testIDs; uses text) | Uses visible text (Detail Aset, Pinjam Aset, Kembalikan Aset, status labels) |
| AssetCheckoutScreen | (no testIDs; uses text) | Uses visible text (Pinjam Aset, condition options: Baik/Cukup/Buruk, date picker, submit buttons) |
| AssetReturnScreen | (no testIDs; uses text) | Uses visible text (Kembalikan Aset, condition selector, return reason, submit) |
| QRScannerScreen | (no testIDs; uses text) | Uses visible text (Pindai QR, code input, submit button) |
| ReportsScreen (Phase 5-1) | (no testIDs; uses text) | Uses visible text (Laporan, filter tabs: status/type, report list, generate FAB) |
| ReportDetailScreen | (no testIDs; uses text) | Uses visible text (Detail Laporan, type labels, status badges, action buttons) |
| WorkerAnalyticsScreen (Phase 5-2) | (no testIDs; uses text) | Uses visible text (Kinerja Saya, performance score, KPI pills, task progress, attendance trend) |
| TeamAnalyticsScreen | (no testIDs; uses text) | Uses visible text (Tim, summary stats, top performers, needs attention, worker list) |

---

## Manual & Device-Gated Flows

### Flows Requiring Special Setup or Device Capabilities

| Flow | Requirement | Notes |
|------|-------------|-------|
| `05-change-password-forced` | Seeded test user with `password_must_change=true` | Backend: `db:seed:staging` includes `temp_user` |
| `06-onboarding-first-launch` | Native permission dialogs | Emulator must be configured with permission stubs or manual OS-level grants |
| `07-onboarding-skip-perms` | Permission denial simulation | Requires Maestro to simulate "Tidak" response; may be manual |
| `08-notifications-inbox` | Pre-seeded notifications | Backend seed must create task assignments or notifications for the test user |
| `09-clock-in-out` | GPS location + camera | GPS can be mocked via emulator or real device; camera requires device or stub |
| `10-activity-submit` | Camera/gallery + GPS | Maestro can mock or skip camera; GPS required for location stamp |
| `14-pruning-kecamatan` | Camera/gallery + GPS | Same as above; plus requires staff_kecamatan_pusat_1 test account |
| `15-offline-sync` | Device airplane mode toggle | Requires adb or manual device UI; **cannot be fully automated in CI** |
| `16-assets-browse-checkout` | Seeded available assets | Backend seed must create asset inventory; no testIDs (text-based) |
| `17-reports-view` | Pre-generated reports | Backend seed must have completed/generated reports; no testIDs (text-based) |
| `18-analytics-worker` | Pre-computed analytics data | Backend must have analytics pipeline running; no testIDs (text-based) |
| `19-analytics-team` | Team analytics data | Backend must populate team/area performance metrics; no testIDs (text-based) |

### Manual Verification Steps

After automated steps, on-device verification includes:

- **Clock-in/out:** Shift timer stops, shift appears in history, GPS + selfie stored in media.
- **Activities:** New activity appears in list with correct type, description, photos.
- **Tasks:** Status changes to "Selesai", completion time recorded.
- **Reassignment:** Worker's assigned area changes, geofence and task filters respect new area.
- **Pruning requests:** Request appears in admin_data review queue with all fields.
- **Offline sync:** Queue is flushed post-reconnect, shift recorded with original timestamp.
- **Assets checkout:** Asset status changes from "Tersedia" to "Digunakan"; assignment appears in detail history.
- **Reports:** Filters work correctly; report detail displays metadata, file formats, and download options.
- **Worker analytics:** Performance score, KPIs, and 7-day attendance trend all load and display correctly.
- **Team analytics:** Summary card, top performers, and needs attention lists populate and refresh correctly.

---

## Test Data & Seed Users

Default test users (from `db:seed:staging`):

```
satgas1 / Password123!               (field worker, satgas)
korlap_pusat_1 / Password123!        (coordinator)
kepala_rayon_pusat_1 / Password123!  (sector head)
admin_data_pusat_1 / Password123!    (admin)
staff_kecamatan_pusat_1 / Password123! (external pruning requester)
temp_user / temp_password           (password_must_change=true for flow 05)
satgas_fresh / Password123!          (for onboarding flows 06-07)
```

Phone login also works (e.g., `081200000006/Password123!`). Check `specs/deployment/` for seeding details.

---

## YAML Validation

Before committing, validate all flows for correct YAML syntax:

```bash
# Using node's js-yaml (if available in apps/mobile/node_modules)
node -e "const yaml = require('js-yaml'); require('fs').readdirSync('.maestro/flows').forEach(f => { console.log('Validating', f); yaml.load(require('fs').readFileSync(\`.maestro/flows/\${f}\`, 'utf-8')); });"

# Or Python (should be available everywhere)
python3 -c "import yaml, sys; [yaml.safe_load(open(f'{f}')) or print(f'✓ {f}') for f in __import__('glob').glob('.maestro/flows/*.yaml')]"

# Or use Maestro itself (requires maestro CLI)
maestro validate .maestro/flows/
```

---

## CI & Execution Details

### GitHub Actions Workflow

**File:** `.github/workflows/mobile-e2e.yml`

Triggers:
- Push to `main`
- `workflow_dispatch` (manual trigger)

**Not triggered:** Every PR (full suite takes ~8 min; smoke tests fast-track PRs if needed)

### Emulator Configuration (Ubuntu CI)

```yaml
- name: Set up Android emulator
  run: |
    sdkmanager "system-images;android-34;default;x86_64"
    avdmanager create avd -n test-emulator -k "system-images;android-34;default;x86_64" -f
    emulator -avd test-emulator -no-window -no-audio -gpu swiftshader_indirect &

- name: Enable KVM
  run: |
    echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger --name-match=kvm

- name: Wait for emulator
  run: adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
```

### APK Installation & Test Run

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
maestro test --retry-count=2 --debug-output=./artifacts apps/mobile/.maestro/flows/
```

### Artifact Handling

On failure, Maestro captures:
- Screenshots (last state before failure)
- Device logs
- Timing info

Uploaded to GitHub Actions artifacts for debugging.

---

## Troubleshooting

### Flow Fails to Start

1. **App won't launch:** Verify APK is installed and appId matches.
   ```bash
   adb shell pm list packages | grep sekar
   ```

2. **Backend unreachable:** Check `.env API_BASE_URL` and that backend is running on the correct host.
   ```bash
   adb shell ping <backend-ip>
   ```

3. **Database not seeded:** Run `npm run db:seed:staging` before tests.

### Permission Dialogs Don't Appear

Maestro 1.x does not natively handle native OS dialogs. Solutions:

1. **Pre-grant permissions on emulator:**
   ```bash
   adb shell pm grant com.wahyutrip.sekar android.permission.ACCESS_FINE_LOCATION
   adb shell pm grant com.wahyutrip.sekar android.permission.CAMERA
   # etc.
   ```

2. **Skip permission flows in CI, run on real device manually:**
   Tag flows with `manual-perms` and exclude from CI.

### Offline Mode Testing

Maestro has no built-in airplane mode control. For flow 15:

```bash
# Manual toggle via adb
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true
# ... run test ...
adb shell settings put global airplane_mode_on 0
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false
```

Or run flow 15 only on real devices with manual mode toggle.

### Timeouts

Increase per-flow timeout (Maestro defaults to 5 min; we use 15 min in CI):

```bash
maestro test --timeout 900 <flow-file>
```

### Seeing Detailed Logs

```bash
maestro test --debug-output=./debug .maestro/flows/
# Check debug/ for screenshots and timing data
```

---

## Future Enhancements

1. **Parallel execution:** Shard flows across multiple emulator instances (requires custom setup).
2. **Advanced offline simulation:** Custom Maestro extension for airplane mode control.
3. **Visual regression:** Add Maestro screenshot diffing for UI consistency.
4. **Performance profiling:** Capture and assert on frame rates, memory usage.
5. **Deep-link testing:** Test navigation via `sekar://tasks/{id}` and similar URIs.

---

## References

- **Maestro Docs:** https://maestro.mobile
- **ADR-017 (Maestro adoption):** `specs/architecture/decisions/ADR-017-maestro-mobile-e2e.md`
- **Phase 4 Testing Spec:** `specs/phases/phase-4-production-readiness/testing.md`
- **Backend API:** `specs/api/contracts.md`
