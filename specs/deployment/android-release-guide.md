# Android Release & Deployment Guide

**Date:** March 13, 2026
**Status:** Active
**Audience:** Developers, DevOps
**Related:** Phase 4 Sub-Phase 4-5 (Release & Deployment)

---

## A. Prerequisites

### A1. Development Environment

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >=24.13.0 | JavaScript runtime |
| Java JDK | 17 | Android build toolchain |
| Android SDK | Build Tools 36.0.0 | Compilation |
| NDK | 27.1.12297006 | Native libraries |
| Gradle | 8.x (via wrapper) | Build system |

### A2. Current Android Configuration

| Setting | Value |
|---------|-------|
| Package name | `com.wahyutrip.sekar` |
| Min SDK | 24 (Android 7.0 Nougat) |
| Target SDK | 36 (Android 15) |
| Compile SDK | 36 |
| Version Code | 1 (auto-incremented in CI) |
| Version Name | 1.0.0 |
| ProGuard | Enabled for release |
| Hermes | Enabled |
| New Architecture | Enabled |

---

## B. Keystore Management

### B1. Generate Release Keystore (One-Time)

```bash
cd fe/mobile/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore sekar-release.keystore \
  -alias sekar-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for:
- **Keystore password** — Choose a strong password (store securely!)
- **Key password** — Can be same as keystore password
- **Your name** — e.g., "DLH Surabaya"
- **Organization** — e.g., "Dinas Lingkungan Hidup Kota Surabaya"
- **City** — "Surabaya"
- **State** — "Jawa Timur"
- **Country** — "ID"

### B2. Configure gradle.properties

```bash
cd fe/mobile/android
cp gradle.properties.example gradle.properties
```

Edit `gradle.properties`:

```properties
# Release Signing (fill in actual values)
SEKAR_RELEASE_STORE_FILE=sekar-release.keystore
SEKAR_RELEASE_STORE_PASSWORD=your_actual_password
SEKAR_RELEASE_KEY_ALIAS=sekar-key
SEKAR_RELEASE_KEY_PASSWORD=your_actual_password
```

> **CRITICAL:** Never commit `gradle.properties` with real passwords. It's already in `.gitignore`.

### B3. Keystore Backup

**Your keystore is irreplaceable.** If lost, you CANNOT update your app on Google Play.

1. **Backup locations** (minimum 2):
   - Encrypted USB drive in a safe
   - Cloud storage (encrypted): Google Drive, AWS S3
   - Password manager (1Password, Bitwarden)
2. **Store separately:**
   - Keystore file (.keystore)
   - Keystore password
   - Key alias
   - Key password
3. **Document the SHA fingerprints:**
   ```bash
   keytool -list -v -keystore sekar-release.keystore -alias sekar-key
   ```
   Record the SHA-1 and SHA-256 fingerprints.

---

## C. Building Locally

### C1. Debug APK (Development)

```bash
cd fe/mobile

# Ensure .env points to local or staging API
echo "API_BASE_URL=http://10.0.2.2:3000" > .env
echo "API_VERSION=v1" >> .env

# Build and install on connected device
npm run android

# Or build APK without installing
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### C2. Release APK (for Direct Distribution)

```bash
cd fe/mobile

# Set production API URL
echo "API_BASE_URL=https://api.sekar.wahyutrip.com" > .env
echo "API_VERSION=v1" >> .env

# Ensure gradle.properties has signing config (Section B2)

# Build release APK
cd android && ./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### C3. Release AAB (for Google Play Store)

```bash
cd fe/mobile

# Set production API URL
echo "API_BASE_URL=https://api.sekar.wahyutrip.com" > .env
echo "API_VERSION=v1" >> .env

# Build Android App Bundle
cd android && ./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

> **AAB vs APK:** Google Play requires AAB format. AAB produces optimized APKs per device, resulting in smaller download sizes (~20-30% smaller). For direct distribution (WhatsApp/email), use APK.

### C4. Staging APK

```bash
cd fe/mobile

# Set staging API URL
echo "API_BASE_URL=https://api-staging.sekar.wahyutrip.com" > .env
echo "API_VERSION=v1" >> .env

# Build release APK (signed, optimized)
cd android && ./gradlew assembleRelease
```

### C5. Verify Signed APK

```bash
# Check APK signing info
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk

# Check APK contents
aapt dump badging android/app/build/outputs/apk/release/app-release.apk | grep -E "package|version"
```

---

## D. Direct APK Distribution (WhatsApp/Email/Link)

### D1. When to Use

- Quick distribution to DLH Surabaya test users
- Before Google Play Store is set up
- Emergency hotfix distribution
- Internal testing

### D2. Steps

1. **Build signed release APK** (Section C2)
2. **Rename for clarity:**
   ```bash
   cp android/app/build/outputs/apk/release/app-release.apk \
      SEKAR-v1.0.0-release.apk
   ```
3. **Distribute via:**
   - **WhatsApp** — Send as file attachment (not photo)
   - **Email** — Attach APK file
   - **Google Drive** — Upload and share link
   - **GitHub Release** — Attach to release (CI does this automatically)
4. **Installation instructions for users:**
   - Download the APK file
   - Open the file on your Android device
   - If prompted, allow "Install from unknown sources" for the browser/app used to download
   - Tap **Install**
   - Open SEKAR and login

### D3. User-Facing Installation Guide (Indonesian)

```
INSTALASI SEKAR APK
====================

1. Unduh file APK yang dikirim
2. Buka file APK di HP Anda
3. Jika muncul peringatan "Sumber tidak dikenal":
   - Buka Pengaturan → Keamanan
   - Aktifkan "Sumber tidak dikenal" atau "Instal aplikasi tidak dikenal"
   - Izinkan untuk browser/WhatsApp yang digunakan
4. Ketuk "Instal"
5. Setelah selesai, ketuk "Buka"
6. Login dengan username dan password Anda

Catatan: Setelah instalasi pertama, update selanjutnya akan
otomatis mengganti versi lama tanpa menghapus data.
```

### D4. Version Management for APK Distribution

Update version in `fe/mobile/android/app/build.gradle` before each release:

```groovy
defaultConfig {
    versionCode 2          // Increment for every release
    versionName "1.0.1"    // Semantic versioning
}
```

**Versioning convention:**
- `versionCode`: Integer, always increment (1, 2, 3, ...)
- `versionName`: Semantic version (`major.minor.patch`)
  - Major: Breaking changes, redesigns
  - Minor: New features (Phase 4 features → 1.1.0)
  - Patch: Bug fixes

---

## E. Google Play Store Distribution

### E1. Initial Setup (One-Time)

1. **Create Google Play Developer Account**
   - Go to https://play.google.com/console
   - Sign in with DLH organization Google account
   - Pay one-time $25 registration fee
   - Complete account details (organization name, address, contact)

2. **Create App in Play Console**
   - Click **Create app**
   - App name: **SEKAR - Sistem Evaluasi Kinerja**
   - Default language: Indonesian
   - App type: Application
   - Free
   - Category: Business / Productivity

3. **App Signing by Google Play**
   - Go to **Setup** → **App signing**
   - Choose **"Use existing key"** if you want to manage your own signing key
   - Or choose **"Let Google manage and protect your app signing key"** (recommended)
   - If using Google-managed signing:
     - Upload your keystore as the "upload key"
     - Google generates the actual signing key
     - Benefits: Google can recover your key if you lose the upload key

4. **Complete Store Listing**
   - **Short description** (80 chars): "Manajemen pekerja RTH Kota Surabaya"
   - **Full description** (4000 chars): Describe all features in Indonesian
   - **Screenshots**: 2-8 screenshots per device type
     - Phone: 1080x1920 or 1440x2560
     - Capture: Login, Home, Clock-In, Tasks, Monitoring Map
   - **Feature graphic**: 1024x500 (displayed at top of listing)
   - **App icon**: 512x512 (high-res, from app icon)
   - **Privacy policy URL**: https://sekar.wahyutrip.com/privacy

5. **Content Rating**
   - Complete the questionnaire
   - Expected rating: Everyone / 3+

6. **Target Audience**
   - Age group: 18+ (work management app)
   - Not designed for children

### E2. Uploading to Play Store

1. Go to **Release** → **Production** (or **Internal testing** first)
2. Click **Create new release**
3. Upload the `.aab` file (Section C3)
4. Add release notes (Indonesian):
   ```
   Versi 1.0.0 - Rilis Pertama
   - Clock-in/out dengan verifikasi GPS dan selfie
   - Manajemen tugas dan aktivitas
   - Monitoring real-time pekerja
   - Notifikasi push
   - Manajemen lembur
   ```
5. Click **Review release**
6. Click **Start rollout**

### E3. Release Tracks

| Track | Audience | Purpose | Review Time |
|-------|----------|---------|-------------|
| **Internal testing** | Up to 100 testers | Dev team testing | No review |
| **Closed testing** | Invite-only testers | DLH beta testing | ~1-3 days |
| **Open testing** | Anyone can join | Public beta | ~1-3 days |
| **Production** | All users | Public release | ~1-3 days |

**Recommended flow:**
```
Internal testing → Closed testing (DLH staff) → Production
```

### E4. Staged Rollout

For production releases, use staged rollout:

1. Start at **10%** — Monitor for 24 hours
2. Increase to **25%** — Monitor for 24 hours
3. Increase to **50%** — Monitor for 24 hours
4. Full **100%** — If no issues

To set: Release → Production → Create release → Set rollout percentage

### E5. Google Play Store Requirements Checklist

- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] At least 2 screenshots (phone)
- [ ] Short description (Indonesian)
- [ ] Full description (Indonesian)
- [ ] Privacy policy URL
- [ ] Content rating completed
- [ ] Target audience declared
- [ ] App signing configured
- [ ] AAB uploaded and signed
- [ ] Release notes written

---

## F. CI/CD Pipeline

### F1. Current Pipeline

**File:** `.github/workflows/mobile-ci-cd.yml.disabled`

The pipeline is currently disabled. To enable:

```bash
mv .github/workflows/mobile-ci-cd.yml.disabled .github/workflows/mobile-ci-cd.yml
```

### F2. Required GitHub Secrets

Set these in **GitHub → Repository → Settings → Secrets**:

| Secret | Description | How to Generate |
|--------|-------------|-----------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | Google Cloud Console |
| `ANDROID_SIGNING_KEY` | Base64-encoded keystore | See F3 |
| `ANDROID_KEY_ALIAS` | Key alias | `sekar-key` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | From keytool generation |
| `ANDROID_KEY_PASSWORD` | Key password | From keytool generation |

### F3. Encode Keystore for GitHub Secrets

```bash
# Convert keystore to base64
base64 -w 0 fe/mobile/android/app/sekar-release.keystore > keystore-base64.txt

# Copy the content of keystore-base64.txt and paste as ANDROID_SIGNING_KEY secret
cat keystore-base64.txt

# Delete the file after copying
rm keystore-base64.txt
```

### F4. Pipeline Behavior

| Branch | Trigger | Build Type | Output |
|--------|---------|-----------|--------|
| `develop` | Push | Debug APK | GitHub Artifact (14 days) |
| `staging` | Push | Signed Release APK | GitHub Artifact (30 days) |
| `main` | Push | Signed Release APK + GitHub Release | Artifact (90 days) + Release |

### F5. Adding Google Play Upload to CI/CD

To auto-upload to Google Play, add this step to the production job:

```yaml
      - name: Upload to Google Play (Internal Testing)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: com.wahyutrip.sekar
          releaseFiles: fe/mobile/android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: completed
```

**Setup:**
1. Create a Google Cloud service account with Play Console access
2. Grant the service account "Release Manager" role in Play Console
3. Download the JSON key file
4. Store as `GOOGLE_PLAY_SERVICE_ACCOUNT` GitHub Secret

---

## G. Environment Configuration

### G1. Environment-Specific .env Files

```bash
# Development (local)
API_BASE_URL=http://10.0.2.2:3000
API_VERSION=v1

# Staging
API_BASE_URL=https://api-staging.sekar.wahyutrip.com
API_VERSION=v1

# Production
API_BASE_URL=https://api.sekar.wahyutrip.com
API_VERSION=v1
```

### G2. Google Maps API Key

Currently hardcoded in `AndroidManifest.xml`. For environment-specific builds, should be injected via CI/CD (see F2).

> **Security Note:** The Google Maps API key should be restricted in Google Cloud Console to:
> - Android apps only (package name + SHA-1 fingerprint)
> - Maps SDK for Android only

---

## H. Troubleshooting

### H1. Build Failures

| Error | Solution |
|-------|----------|
| `Could not find com.facebook.react:react-android` | Run `npm install` first |
| `Keystore was tampered with` | Verify keystore password |
| `SDK location not found` | Set `ANDROID_HOME` or create `local.properties` |
| `Execution failed for task ':app:mergeReleaseResources'` | `cd android && ./gradlew clean` |
| Out of memory during build | Increase `org.gradle.jvmargs` in gradle.properties |

### H2. Signing Issues

```bash
# Verify keystore is valid
keytool -list -v -keystore sekar-release.keystore

# Verify APK is signed correctly
apksigner verify --verbose app-release.apk

# Check SHA-1 fingerprint (needed for Google Maps + Firebase)
keytool -list -v -keystore sekar-release.keystore -alias sekar-key | grep SHA1
```

### H3. Installation Issues on Device

| Error | Solution |
|-------|----------|
| "App not installed" | Check if debug version installed (uninstall first) |
| "Parse error" | APK may be corrupt, re-download |
| "Blocked by Play Protect" | Tap "Install anyway" or add app to allowed list |
| App crashes on launch | Check .env API_BASE_URL is correct for the environment |

---

## I. Release Checklist

### I1. Pre-Release

- [ ] Version code and version name updated in `build.gradle`
- [ ] `.env` points to correct API URL (staging or production)
- [ ] All tests passing (`npm test`)
- [ ] APK builds without errors
- [ ] APK tested on at least 2 devices (different Android versions)
- [ ] No console.log in production code
- [ ] ProGuard not stripping required classes (test critical flows)
- [ ] GPS, camera, notifications all working
- [ ] Offline sync working (disconnect WiFi, perform actions, reconnect)

### I2. Release

- [ ] Build signed APK/AAB
- [ ] Upload to distribution channel (Play Store or direct)
- [ ] Write release notes
- [ ] Notify users of update

### I3. Post-Release

- [ ] Monitor Sentry for crashes (24 hours)
- [ ] Monitor Google Play Console crash reports
- [ ] Check user feedback/reviews
- [ ] Verify key flows work (login, clock-in, tasks)

---

## J. Quick Reference Commands

```bash
# Build debug APK
cd fe/mobile/android && ./gradlew assembleDebug

# Build release APK (signed)
cd fe/mobile/android && ./gradlew assembleRelease

# Build AAB for Play Store
cd fe/mobile/android && ./gradlew bundleRelease

# Clean build
cd fe/mobile/android && ./gradlew clean

# Install APK on device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Install on all connected devices
adb devices | tail -n +2 | cut -sf 1 | xargs -I {} adb -s {} install -r app-release.apk

# Check APK size
ls -lh android/app/build/outputs/apk/release/app-release.apk

# View logcat (for debugging installed app)
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

**Last Updated:** 2026-03-13
