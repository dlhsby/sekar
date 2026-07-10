# SEKAR Credentials Setup Guide

**Purpose:** Complete reference for obtaining and installing every external API key and credential (Firebase/FCM, Google Maps, AWS S3, Apple Push Notifications).

**Last Updated:** June 19, 2026

**Current Reality (2026-06):** Staging = AWS (shared RDS + S3); Production = on-prem Docker Compose with MinIO; Dev = local MinIO. Env model = dotenvx (encrypted .env files + per-file private key in .env.keys). For deployment from scratch, see `specs/deployment/README.md`.

**Status:** Comprehensive guide covering all credential types across dev / staging / production environments.

---

## Overview Table

| Credential | Service | Where to Get | File / Env Var | Workspace | Required | Dev | Staging | Prod |
|---|---|---|---|---|---|---|---|---|
| **FCM Service Account** | Firebase | Firebase Console → Project Settings → Service Accounts | `apps/be/config/firebase-service-account.json` | Backend | Opt* | MinIO | AWS S3 + FCM (enabled) | MinIO + FCM (enabled) |
| **FCM Inline Env Vars** | Firebase | Firebase Console → Service Account JSON (parse) | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | Backend | Opt* | MinIO | AWS S3 + FCM (enabled) | MinIO + FCM (enabled) |
| **Android `google-services.json`** | Firebase | Firebase Console → Add Android app | `apps/mobile/android/app/google-services.json` | Mobile | Opt* | MinIO | AWS S3 + FCM (enabled) | MinIO + FCM (enabled) |
| **iOS `GoogleService-Info.plist`** | Firebase | Firebase Console → Add iOS app | `apps/mobile/ios/GoogleService-Info.plist` | Mobile | Opt* | MinIO | AWS S3 + FCM (enabled) | MinIO + FCM (enabled) |
| **APNs Key / Certificate** | Apple Developer | Apple Developer Portal | Firebase Console upload (production) | Mobile | Prod iOS | N/A | N/A | Required |
| **Google Maps API Key** | Google Cloud | Google Cloud Console → Maps SDK | `apps/mobile/.env.local` `GOOGLE_MAPS_API_KEY` | Mobile | Yes | Yes | Yes | Yes |
| **Maps Key SHA-1 Restriction** | Google Cloud | `cd apps/mobile/android && ./gradlew signingReport` | Google Cloud Console API key restrictions | Mobile | Prod | Optional | Yes | Yes |
| **Google Maps API Key** | Google Maps | https://console.cloud.google.com/google/maps-apis | `apps/web/.env.local` `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Web | Yes | Yes | Yes | Yes |
| **AWS Access Key ID** | AWS IAM | AWS Console → IAM → Users → `sekar-s3-user` → Security credentials | `.env.staging` / `.env.production` `AWS_ACCESS_KEY_ID` | Backend | Staging only (Prod uses MinIO) | MinIO | Yes (staging) | N/A (MinIO) |
| **AWS Secret Access Key** | AWS IAM | AWS Console → IAM → Users → `sekar-s3-user` → Security credentials | `.env.staging` / `.env.production` `AWS_SECRET_ACCESS_KEY` | Backend | Staging only (Prod uses MinIO) | MinIO | Yes (staging) | N/A (MinIO) |
| **S3 Bucket Name** | AWS S3 | AWS Console → S3 → Bucket name | `.env.local` / `.env.staging` / `.env.production` `AWS_S3_BUCKET` | Backend | All environments | `sekar-media-dev` | `sekar-media-staging` (real AWS) | N/A (MinIO, configured in docker-compose.prod.yml) |

\* **FCM:** Enable with `FCM_ENABLED=true` and provide service account (encrypted env vars in `.env.staging`/`.env.production` via dotenvx). Optional in dev, required for staging/prod. Firebase services handle push notifications.

\*\* **S3 by environment:** Dev = local MinIO (`sekar-media-dev`); Staging = real AWS S3 (`sekar-media-staging`); Production = MinIO in `docker-compose.prod.yml` (NOT real AWS, per project convention).

---

## 1. Firebase Cloud Messaging (FCM) — Push Notifications

Firebase enables Android and iOS push notifications via Firebase Cloud Messaging.

> **Current Firebase projects (migrated 2026-06, owner `dlhsby.sekar@gmail.com`):**
> `dlhsby-sekar-dev` · `dlhsby-sekar-staging` · `dlhsby-sekar-production`. The app
> (Android + iOS) is registered in each as **`com.wahyutrip.sekar`**.
> - **App config (Android `google-services.json`)** is delivered to CI via per-environment
>   secrets — `GOOGLE_SERVICES_JSON_STAGING` (staging env) and `GOOGLE_SERVICES_JSON_PRODUCTION`
>   (production env), each the base64 of that project's `google-services.json`. iOS
>   `GoogleService-Info.plist` exists per project but is **not yet CI-wired** (iOS isn't built in CI).
> - **Backend FCM sender** authenticates with a key from each project's `firebase-adminsdk-fbsvc@…`
>   service account (`FCM_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` in the encrypted `apps/be/.env.staging` and
>   repo-root `.env.production`). The org policy **`iam.disableServiceAccountKeyCreation`** blocks
>   creating *new* SA keys, so reuse the existing key; relax the policy only if you must rotate.
> - ⚠️ A pre-migration **`GoogleService-Info.plist` (old project `sekar-dev`)** was committed in
>   git history (commit `49a7a49`) and exposes a Firebase **client** API key (`AIzaSy…fc4`). That
>   project is defunct post-migration; the key is harmless but delete the `sekar-dev` project if you
>   can still reach it. Firebase API keys are client identifiers, not secrets — real protection is
>   App Check + Security Rules.

### 1.1 Create Firebase Project

**In the browser:**

1. Go to https://console.firebase.google.com
2. Click **Add project** or **Create a project**
3. Enter **Project name:** `SEKAR-Production` (or your preferred name)
4. Optionally enable **Google Analytics** for tracking
5. Click **Create project**
6. Wait ~30 seconds for initialization

### 1.2 Backend: Download Service Account

The service account grants the backend permission to send FCM messages via the Firebase Admin SDK HTTP v1 API.

**In Firebase Console:**

1. Go to **Project Settings** (gear icon, top-right)
2. Click the **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the downloaded JSON file

**On your local machine:**

```bash
# Place the JSON file in the backend config directory
cp ~/Downloads/SEKAR-Production-XXXXXXXX.json apps/be/config/firebase-service-account.json

# Verify the file is gitignored
cat apps/be/.gitignore | grep firebase-service-account.json
# Output: config/firebase-service-account.json
```

**Set environment variable in `apps/be/.env.local`:**

```bash
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

The backend's `firebase.config.ts` automatically loads the file on boot. If the file is missing or invalid, the app will log a detailed error with next steps.

**Alternative: Inline Environment Variables**

If hosting in a CI/CD environment where mounting a file is awkward, extract the three credential fields from the service account JSON and set them as env vars instead:

```bash
# From the JSON file:
# {
#   "project_id": "sekar-production-abc123",
#   "client_email": "firebase-adminsdk-a1b2c@sekar-production.iam.gserviceaccount.com",
#   "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# }

FCM_ENABLED=true
FCM_PROJECT_ID=sekar-production-abc123
FCM_CLIENT_EMAIL=firebase-adminsdk-a1b2c@sekar-production.iam.gserviceaccount.com
# Important: escape newlines in the private key as literal \n
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n"
```

When all three inline vars are set, they take precedence over the JSON file. The backend detects the setup at startup and logs which method is active.

### 1.3 Android: Register App and Download Configuration

**In Firebase Console:**

1. Click **Add app** → Select the **Android** icon
2. Fill in the registration form:
   - **Android package name:** `com.wahyutrip.sekar` (must match `apps/mobile/android/app/build.gradle` `applicationId`)
   - **App nickname:** SEKAR Mobile Android
   - **Debug signing certificate SHA-1:** (optional for development; required for production — see Section 1.3.2 below)
3. Click **Register app**
4. Download the `google-services.json` file

**On your local machine:**

```bash
# Place the JSON in the Android app module
cp ~/Downloads/google-services.json apps/mobile/android/app/google-services.json

# Verify gitignored
cat apps/mobile/.gitignore | grep google-services.json
# Output: android/app/google-services.json
```

**Gradle Integration:**

The repo already has Firebase Gradle plugin configured:

- `apps/mobile/android/build.gradle` includes: `classpath 'com.google.gms:google-services:4.3.15'`
- `apps/mobile/android/app/build.gradle` includes: `apply plugin: 'com.google.gms.google-services'` (uncommented when `google-services.json` is present)

**No further Gradle changes needed.** The FCM SDKs (`@react-native-firebase/app` and `@react-native-firebase/messaging`) are installed via npm and auto-linked by the Metro build system.

#### 1.3.2 Production: Add Signing Certificate SHA-1

For production APK releases, the Maps key (Section 2) must be restricted to the app's release signing certificate. Similarly, Firebase requires the release SHA-1 for analytics and crash reporting accuracy.

**Get the release SHA-1:**

```bash
cd apps/mobile/android
./gradlew signingReport
```

Output example:
```
release
--------
 SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
```

Copy the SHA-1 without colons:

```
ABCDEF1234567890ABCDEF1234567890ABCDEF12
```

**In Firebase Console:**

1. Go to **Project Settings** → **Your apps** → **SEKAR Mobile Android**
2. Click **Add fingerprint**
3. Paste the release SHA-1
4. Click **Save**

### 1.4 iOS: Register App and Download Configuration

**In Firebase Console:**

1. Click **Add app** → Select the **iOS** icon
2. Fill in the registration form:
   - **iOS bundle ID:** `org.sekar.mobile` (must match Xcode project)
   - **App nickname:** SEKAR Mobile iOS
   - **App Store ID:** (optional, leave blank for now)
3. Click **Register app**
4. Download the `GoogleService-Info.plist` file

**On your local machine (requires macOS + Xcode):**

```bash
# Place the plist in the iOS project
cp ~/Downloads/GoogleService-Info.plist apps/mobile/ios/GoogleService-Info.plist

# Or, if you prefer to keep it in version control as a template:
cp ~/Downloads/GoogleService-Info.plist apps/mobile/ios/GoogleService-Info.plist.example
# Then gitignore the real file and document that devs must add it manually
```

The repo's `.gitignore` already excludes the plist:

```gitignore
# Firebase
ios/GoogleService-Info.plist
!ios/GoogleService-Info.plist.example
```

**In Xcode (apps/mobile/ios/sekar.xcworkspace):**

1. Open the workspace in Xcode
2. In the project navigator, right-click and select **Add Files to "sekar"**
3. Select the `GoogleService-Info.plist` file
4. Check **Copy items if needed** and select target **sekar**
5. Click **Add**

**Enable Push Notifications Capability:**

1. In Xcode, select the **sekar** target
2. Go to the **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes**
6. Check **Remote notifications**

#### 1.4.1 Production: Apple Push Notifications (APNs) Key

For production iOS deployments, you must upload an APNs key (or certificate) to Firebase. This allows Firebase to route push notifications through Apple's APNs infrastructure.

**See:** `specs/deployment/ios-release-guide.md` for the complete macOS-only APNs setup workflow (Apple Developer Portal, CSR, certificate generation, Firebase upload).

### 1.5 Mobile App: Install Firebase Packages

```bash
cd apps/mobile

# Install Firebase packages
npm install @react-native-firebase/app@^18.0.0
npm install @react-native-firebase/messaging@^18.0.0

# Install Notifee for notification display (recommended)
npm install @notifee/react-native@^7.8.0
```

**For iOS (macOS only):**

```bash
cd apps/mobile/ios
pod install
cd ..
```

**Verify the installation:**

```bash
grep -E "firebase|notifee" apps/mobile/package.json
```

### 1.6 Backend: Notification Service Configuration

The backend already has Firebase Admin SDK integration. Verify the setup:

**File:** `apps/be/src/modules/notifications/notifications.service.ts`

- Should import and use `getMessaging()` from `apps/be/src/config/firebase.config.ts`
- Sends FCM messages via the HTTP v1 API

**Environment Variables:**

`apps/be/.env.local` (or `.env.staging`/`.env.production`):

```bash
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
# OR inline (if using CI/CD):
# FCM_PROJECT_ID=...
# FCM_CLIENT_EMAIL=...
# FCM_PRIVATE_KEY=...
```

### 1.7 Testing FCM

**Android (Physical Device):**

```bash
cd apps/mobile
npm run android

# Verify token registration in logcat
adb logcat | grep "FCM\|Token"
```

**iOS (Physical Device, macOS only):**

```bash
cd apps/mobile/ios
open sekar.xcworkspace

# In Xcode: Select device (not simulator) → Run (⌘R)
# Check console for FCM token output
```

**Send Test Notification:**

```bash
# Via backend API (Swagger UI or Postman)
POST http://localhost:3000/api/v1/notifications/send
{
  "userId": "worker-uuid",
  "title": "Test Notification",
  "body": "This is a test",
  "data": { "type": "test" }
}
```

**Troubleshooting:**

- **Token not generated:** Verify `google-services.json` / `GoogleService-Info.plist` are in the correct paths and gitignored in CI/CD.
- **Notifications not received:** Check backend logs for FCM errors. Verify the FCM token is registered with the backend.
- **iOS notifications not working:** Ensure APNs key/certificate is uploaded to Firebase and device has notification permissions enabled in iOS Settings.

---

## 2. Google Maps API Key — Native Mobile Maps

Google Maps SDK for Android (and optionally iOS) enables the supervisor map view for worker location tracking.

### 2.1 Create API Key

**In Google Cloud Console (https://console.cloud.google.com/):**

1. Create a new project or select an existing one
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **API Key**
4. A new API key is generated (e.g., `AIzaSy...`)

### 2.2 Enable Maps SDKs

1. Go to **APIs & Services** → **Library**
2. Search for **Maps SDK for Android**
3. Click and press **Enable**
4. (Optional) Search for **Maps SDK for iOS** and enable if building for iOS

### 2.3 Restrict API Key (Development)

For development, restriction is optional. But it's recommended to prevent unauthorized use.

**In Credentials → Your API Key:**

1. Click the key name to edit
2. Under **API restrictions:**
   - Select **Restrict key** and choose **Maps SDK for Android** (and iOS if enabled)
3. Under **Application restrictions:**
   - Select **Android apps**
   - Add package name: `com.wahyutrip.sekar`
   - (Optional) Add debug certificate SHA-1 from `cd apps/mobile/android && ./gradlew signingReport`

### 2.4 Production: Restrict by Release SHA-1

For production, the API key must be restricted to the **release** signing certificate to prevent unauthorized apps from using your key.

**Get the release SHA-1:**

```bash
cd apps/mobile/android
./gradlew signingReport
```

Find the **release** section and copy the SHA-1 (remove colons).

**In Google Cloud Console:**

1. Go to **APIs & Services** → **Credentials** → Your API Key
2. Under **Application restrictions:**
   - Select **Android apps**
   - Remove the debug SHA-1 (if present)
   - Add the release SHA-1 and package name `com.wahyutrip.sekar`
3. Click **Save**

### 2.5 Configure the native Android Maps key (gradle property)

The Google Maps **SDK** key is injected into `AndroidManifest.xml` at build time via a
**manifest placeholder** — it is **never hardcoded** in the manifest. The manifest reads:

```xml
<meta-data android:name="com.google.android.geo.API_KEY" android:value="${MAPS_API_KEY}"/>
```

and `apps/mobile/android/app/build.gradle` resolves it from the gitignored gradle property
`SEKAR_MAPS_API_KEY` (mirroring how the release keystore props are supplied):

```groovy
manifestPlaceholders = [MAPS_API_KEY: project.findProperty('SEKAR_MAPS_API_KEY') ?: '']
```

Provide the value via any gitignored channel (an empty fallback keeps the build green, maps just render blank):

```properties
# ~/.gradle/gradle.properties  (user-global, never committed) — or android/gradle.properties (gitignored)
SEKAR_MAPS_API_KEY=AIzaSy...your-key...
```
…or per-invocation: `./gradlew assembleRelease -PSEKAR_MAPS_API_KEY=AIzaSy...` / env `ORG_GRADLE_PROJECT_SEKAR_MAPS_API_KEY=...`.

> **Two different keys:** the native **SDK** key above (manifest, for `react-native-maps` rendering) is distinct from
> `GOOGLE_MAPS_API_KEY` in `apps/mobile/.env.local` (loaded by `react-native-dotenv` for JS-side calls). Both can be the
> same restricted key, but they are wired through different mechanisms.

### 2.6 SECURITY NOTE: Previously-committed key rotated

A Maps key was **previously hardcoded and committed** at `AndroidManifest.xml:49`
(`AIzaSyDwi4oORUhHRZi60sDRk5mDqrYqdlR2lGM`). The hardcode has been **removed** (§2.5), and the value
**remains in git history**, so it was treated as exposed and rotated.

**Risk:** keys in a released APK are publicly extractable (APKs decompile trivially); an unrestricted key can be abused for quota/cost.

**Status (resolved):**

1. ✓ Old key was rotated in Google Cloud Console.
2. ✓ New key restricted to Android package `com.wahyutrip.sekar` + release SHA-1; API restriction → Maps SDKs only.
3. ✓ Key is now supplied via `SEKAR_MAPS_API_KEY` gradle property (§2.5) — never hardcoded.
4. Maps-key rotation is on the security checklist (quarterly audit).

---

## 3. Google Maps API Key — Web Maps

Google Maps is the sole map provider for the web dashboard — the monitoring map, the boundary/pin editors, the coordinate display modal, and address search all use it.

### 3.1 Create Your API Key

**In the Google Cloud console:**

1. Go to https://console.cloud.google.com/google/maps-apis
2. Create (or select) a Google Cloud project.
3. Enable the **Maps JavaScript API** and the **Geocoding API** (both required — the map + the address search).
4. Under **Keys & Credentials → Create credentials → API key**, create a key (e.g. `SEKAR Web Dev`). It looks like `AIzaSy...`.
5. Restrict the key: **Application restrictions → HTTP referrers** (e.g. `http://localhost:3001/*` for dev, `https://sekar.wahyutrip.com/*` for prod) and **API restrictions →** the two APIs above.

The same key is shared with the backend (`GOOGLE_MAPS_API_KEY`, used for `seed:geocode` + `GET /config/maps`) and the mobile app.

### 3.2 Configure Web App

**File:** `apps/web/.env.local`

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your-key...
```

**Note:** The `NEXT_PUBLIC_` prefix inlines this key into the browser bundle (intentional for client-side maps) — keep it referrer-restricted. If it's left unset, the web falls back to the backend-served key (`GET /config/maps`), then to manual lat/lng inputs.

### 3.3 Verify

```bash
# Start the web dashboard
cd apps/web
npm run dev

# Visit http://localhost:3001
# Navigate to Monitoring or the Rayon/Area forms
# Verify the map renders without blank tiles
```

**Troubleshooting:**

- **Map is blank:** Verify the key is set in `.env.local` and the web server has been restarted
- **`ApiNotActivatedMapError` / grey map:** Enable the **Maps JavaScript API** on the key's project
- **`RefererNotAllowedMapError`:** Add your origin to the key's HTTP-referrer restrictions

---

## 4. AWS S3 & IAM — Production Media Storage

S3 stores user-uploaded media (selfies on clock-in, work report photos/videos). This section covers **production** AWS setup. For local development, see Section 6 below.

### 4.1 Create AWS Account

If you don't have one, sign up at https://aws.amazon.com/

### 4.2 Create S3 Bucket

**In AWS Console:**

1. Navigate to **S3**
2. Click **Create bucket**
3. **Bucket name:** `sekar-media-staging` (for staging) or `sekar-media-production` (for production)
4. **Region:** `ap-southeast-3` (Jakarta, in-country; staging shares this region with the KPI box)
5. **Object Ownership:** ACLs disabled (recommended)
6. **Block Public Access:** Keep all blocks enabled ✓ (use signed URLs instead of public access)
7. **Versioning:** Disabled (optional; enable for production data protection)
8. **Encryption:** Enable (SSE-S3 or SSE-KMS)
9. Click **Create bucket**

### 4.3 Create IAM User

**In AWS Console → IAM → Users:**

1. Click **Create user**
2. **User name:** `sekar-s3-user`
3. Click **Next**

### 4.4 Attach S3 Permissions

**Select one option:**

**Option A: Quick Setup (AmazonS3FullAccess)**

1. Check **Attach policies directly**
2. Search for and select `AmazonS3FullAccess`
3. Click **Create user**

**Option B: Custom Policy (Recommended for Production)**

1. Check **Attach policies directly**
2. Click **Create policy**
3. Paste this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sekar-media-production",
        "arn:aws:s3:::sekar-media-production/*"
      ]
    }
  ]
}
```

Replace `sekar-media-production` with your bucket name.

4. Click **Create policy**
5. Attach the policy to the user and click **Create user**

### 4.5 Create Access Keys

**In AWS Console → IAM → Users → sekar-s3-user → Security credentials:**

1. Scroll to **Access keys**
2. Click **Create access key**
3. Select **Application running outside AWS**
4. Click **Next** → **Create access key**
5. **CRITICAL:** Copy and save both immediately (shown only once):
   - **Access Key ID** (e.g., `AKIA...`)
   - **Secret Access Key**

Do NOT close the page until saved. If you forget the secret key, delete the key and create a new one.

### 4.6 Configure CORS (Browser Direct Uploads)

If your frontend uploads directly to S3 (not through backend), configure CORS:

**In AWS Console → S3 → Your bucket → Permissions → CORS:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3001",
      "https://sekar.wahyutrip.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**For production,** replace `AllowedOrigins` with your actual domain(s) only.

### 4.7 Configure Backend — Staging (AWS S3)

**File:** `.env.staging` (encrypted via dotenvx)

```bash
# AWS S3 Configuration (staging uses real AWS S3)
AWS_REGION=ap-southeast-3
AWS_ACCESS_KEY_ID=AKIA...your-staging-key...
AWS_SECRET_ACCESS_KEY=your-staging-secret-key
AWS_S3_BUCKET=sekar-media-staging

# Do NOT set AWS_ENDPOINT_URL or AWS_S3_FORCE_PATH_STYLE for real AWS
```

**Encryption:** These values are encrypted in the repo. Only the private key is stored in `.env.keys` (gitignored). See `specs/deployment/encrypted-secrets.md` for dotenvx setup.

### 4.7.1 Configure Backend — Production (MinIO)

**File:** `docker-compose.prod.yml` and `.env.production` (encrypted via dotenvx)

Production does NOT use real AWS S3. Instead, it uses MinIO inside the Docker Compose stack.

```bash
# .env.production (encrypted)
AWS_REGION=us-east-1  # MinIO default region
AWS_S3_BUCKET=sekar-media  # MinIO bucket name (created during infra setup)

# MinIO endpoint is configured in docker-compose.prod.yml
# AWS_ENDPOINT_URL=http://sekar-minio:9000 (internal Docker DNS)
# AWS_S3_FORCE_PATH_STYLE=true  (MinIO requires path-style URLs)
```

MinIO credentials (root user/password) are managed via `docker-compose.prod.yml` secret/env injection, NOT in `.env.production`.

### 4.8 Enable Encryption

**In AWS Console → S3 → Your bucket → Properties → Default encryption:**

```bash
aws s3api put-bucket-encryption \
  --bucket sekar-media-staging \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 4.9 Key Rotation (Every 90 days)

1. **In AWS Console → IAM → Users → sekar-s3-user → Security credentials:**
   - Click **Create access key**
   - Update your deployment config with the new key
   - Wait for deployments to complete
   - Delete the old access key

2. **Document the rotation** in your change log for audit purposes

### 4.10 Verify Configuration

```bash
# List buckets
aws s3 ls

# List objects in bucket
aws s3 ls s3://sekar-media-staging --recursive

# Test upload (backend login + clock-in with selfie)
# Verify uploaded file appears in bucket
```

---

## 5. Per-Environment Summary

### Development (Local)

| Credential | Service | Status | Notes |
|---|---|---|---|
| FCM | Firebase | Optional | Set `FCM_ENABLED=false` to skip; Firebase services disabled locally |
| Google Maps | Google Cloud | Required | Use dev API key (unrestricted OK locally) |
| Google Maps | Google Maps | Required | Use dev token |
| AWS S3 | MinIO (local) | Required | Uses `apps/be/.env.local` with MinIO endpoint; no real AWS keys needed |
| APNs | Apple | N/A | Not needed for dev (simulator push doesn't work) |

**Sample `.env.local` files (plaintext, NOT encrypted):**

`apps/be/.env.local`:
```bash
FCM_ENABLED=false
AWS_ENDPOINT_URL=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=sekar-media-dev
```

`apps/mobile/.env.local`:
```bash
GOOGLE_MAPS_API_KEY=AIzaSy...dev-key...
API_BASE_URL=http://10.0.2.2:3000
```

`apps/web/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...dev-key...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Staging (AWS-hosted)

| Credential | Service | Status | Notes |
|---|---|---|---|
| FCM | Firebase | Required | `FCM_ENABLED=true`; creds encrypted in `.env.staging` (dotenvx) |
| Google Maps | Google Cloud | Required | Use staging key; restrict to release SHA-1 of staging APK |
| Google Maps | Google Maps | Required | Use staging token |
| AWS S3 | Real AWS | Required | `sekar-media-staging` bucket; restricted IAM user (no instance role) |
| APNs | Apple | Recommended | Upload to Firebase for iOS push testing |

**Sample `.env.staging` (encrypted; decrypted at runtime via dotenvx):**
```bash
FCM_ENABLED=true
FCM_PROJECT_ID=sekar-staging-xxx
FCM_CLIENT_EMAIL=firebase-adminsdk-...@sekar-staging.iam.gserviceaccount.com
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
AWS_REGION=ap-southeast-3
AWS_ACCESS_KEY_ID=AKIA...staging-key...
AWS_SECRET_ACCESS_KEY=...staging-secret...
AWS_S3_BUCKET=sekar-media-staging
DATABASE_HOST=dlhsby.xxxxx.ap-southeast-3.rds.amazonaws.com
DATABASE_NAME=sekar_staging
```

See `specs/deployment/encrypted-secrets.md` for how to set up dotenvx encryption locally and in CI/CD.

#### Staging RDS — master (root) credentials

The staging database lives on the shared AWS RDS instance **`dlhsby`** (formerly `kobin-kpi-db`;
renamed when project KPI was decommissioned in 2026-06). SEKAR's app authenticates
as the dedicated **`sekar`** role against the **`sekar_staging`** database — it never
uses the master account. The instance **master (root)** credentials are:

| Item | Value / location |
|---|---|
| Master username | `kpi` (set at instance creation; not renamable) — also in SSM `/sekar/staging/RDS_MASTER_USERNAME` |
| Master password | SSM SecureString **`/sekar/staging/RDS_MASTER_PASSWORD`** (rotated on the KPI decommission) |
| Endpoint | `dlhsby.cvuoeguwo5dg.ap-southeast-3.rds.amazonaws.com:5432` |

Retrieve the master password (e.g. for `psql`/Adminer admin tasks):
```bash
aws ssm get-parameter --region ap-southeast-3 \
  --name /sekar/staging/RDS_MASTER_PASSWORD --with-decryption \
  --query Parameter.Value --output text
```
The EC2 box's instance role can read `/sekar/staging/*`, so admin scripts on the box
can fetch it without embedding a static password. Never commit the value to git.

### Production (On-Prem Docker Compose)

| Credential | Service | Status | Notes |
|---|---|---|---|
| FCM | Firebase | Required | `FCM_ENABLED=true`; creds encrypted in `.env.production` (dotenvx) |
| Google Maps | Google Cloud | Required | **Must be restricted to release SHA-1 of production APK** |
| Google Maps | Google Maps | Required | Production token with appropriate usage limits |
| AWS S3 | MinIO (self-hosted) | Required | Uses MinIO in `docker-compose.prod.yml`; NOT real AWS (per project convention) |
| APNs | Apple | Required | Uploaded to Firebase; required for iOS push in production |

**Sample `.env.production` (encrypted; repo-root, NOT `apps/be/`, decrypted at runtime via dotenvx):**
```bash
FCM_ENABLED=true
FCM_PROJECT_ID=sekar-production-xxx
FCM_CLIENT_EMAIL=firebase-adminsdk-...@sekar-production.iam.gserviceaccount.com
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
DATABASE_HOST=localhost
DATABASE_NAME=sekar_db
DATABASE_PASSWORD=your-prod-password
REDIS_URL=redis://sekar-redis:6379
```

**Notes:**

- `.env.production` is **committed encrypted** (dotenvx); only the private key is gitignored in `.env.keys`.
- Production backend uses **MinIO inside `docker-compose.prod.yml`**, not real AWS S3. MinIO root credentials are injected via Docker Compose (not in `.env.production`).
- See `specs/deployment/encrypted-secrets.md` for dotenvx setup and key management in GitHub Actions / AWS SSM.
- See `specs/deployment/README.md` for complete production deployment instructions.

---

## 6. Local Development: MinIO as S3 Alternative

For local development, the project uses **MinIO** — a self-hosted, S3-compatible storage service.

**See:** `specs/deployment/local-development.md` for the MinIO setup and docker-compose configuration.

**Quick reference:**

```bash
# Start MinIO (via infra docker-compose)
./scripts/infra.sh start

# MinIO runs on http://localhost:9000 (API) and http://localhost:9001 (console)
# Default credentials: minioadmin / minioadmin

# Configure backend for MinIO
# apps/be/.env.local:
AWS_ENDPOINT_URL=http://localhost:9000
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=sekar-media-dev
```

---

## 7. Security Best Practices

### Never Commit Secrets

```bash
# Verify .gitignore covers all sensitive files:
cat apps/be/.gitignore | grep -E "^config/firebase|^\.env"
cat apps/mobile/.gitignore | grep -E "^android/app/google|^ios/GoogleService|^\.env"
```

### Use IAM Policies with Least Privilege

- Only grant necessary S3 actions (PutObject, GetObject, ListBucket)
- Restrict to specific bucket ARNs
- Avoid `AmazonS3FullAccess` in production

### Enable S3 Encryption

All S3 buckets should use SSE-S3 or SSE-KMS encryption.

### Block Public Access

Keep all S3 "Block Public Access" settings enabled. Use signed URLs for private content access.

### API Key Restrictions

- **Google Maps:** Restrict to package `com.wahyutrip.sekar` and release SHA-1
- **Google Maps:** Enable usage limits in Google Maps account settings

### Rotate Credentials Regularly

- **AWS Access Keys:** Every 90 days
- **Firebase Service Accounts:** Annually
- **API Keys:** Annually or after any suspected compromise

### Secret Storage in CI/CD

Store all secrets as **platform secrets**, NOT in version control:

- **GitHub:** Settings → Secrets and variables → Actions → New repository secret
- **AWS:** AWS Secrets Manager or Parameter Store
- **Docker/Kubernetes:** Use secrets objects, not hardcoded values

### Audit Logs

Enable S3 access logging (production):

```bash
aws s3api put-bucket-logging \
  --bucket sekar-media-production \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "sekar-logs",
      "TargetPrefix": "s3-access/"
    }
  }'
```

---

## 8. Related Documentation

- **Encrypted Secrets (dotenvx):** `specs/deployment/encrypted-secrets.md` (env encryption model, key management, GitHub Secrets, AWS SSM)
- **Deployment Guide:** `specs/deployment/README.md` (authoritative from-scratch guide; staging on AWS, production on-prem)
- **Local Development:** `specs/deployment/local-development.md` (Docker infra, MinIO dev S3, WSL2 device networking)
- **AWS Infrastructure (Reference):** `specs/deployment/infrastructure.md` (VPC, RDS, S3, IAM, CloudFront — describes staging setup)
- **Operations Runbook:** `specs/deployment/operations.md` (day-2 ops, incident response, migrations, rollback)
- **iOS Release Guide:** `specs/deployment/ios-release-guide.md` (APNs, TestFlight, App Store)
- **Android Release Guide:** `specs/deployment/android-release-guide.md` (Google Play release process)
- **Environment Variables:** `specs/deployment/environment-variables.md` (Full reference of all env vars)

---

## 9. Troubleshooting

### "Cannot find service account file"

**Cause:** `apps/be/config/firebase-service-account.json` is missing.

**Solution:**

1. Download service account JSON from Firebase Console
2. Place in `apps/be/config/firebase-service-account.json`
3. Verify it's gitignored: `cat apps/be/.gitignore | grep firebase`
4. Restart backend

### "AWS Access Key Id ... does not exist"

**Cause:** Incorrect access key ID in `.env` or key was deleted.

**Solution:**

1. Verify the key ID: `cat apps/be/.env | grep AWS_ACCESS_KEY_ID`
2. Go to AWS Console → IAM → Users → sekar-s3-user → Security credentials
3. Create a new access key if needed
4. Update `.env` and restart backend

### "Access Denied" on S3 upload

**Cause:** IAM user lacks PutObject permission.

**Solution:**

1. Go to AWS Console → IAM → Users → sekar-s3-user → Permissions
2. Verify the S3 policy is attached
3. Verify the policy allows `PutObject` on the bucket ARN
4. Restart backend after fixing

### Map is blank in web or mobile

**Causes:**
- Missing API key / token
- Token/key is invalid or expired
- Service is rate-limited or disabled

**Solutions:**

1. Verify the key/token is set in `.env.local`
2. Verify the key/token is correct by copying from the console again
3. Check browser console / logcat for errors
4. Verify the Maps service is enabled in the respective console
5. Restart the app

### FCM token not generated

**Cause:** Firebase config files not in correct path.

**Solution:**

1. Verify `apps/mobile/android/app/google-services.json` exists
2. Verify `apps/mobile/ios/GoogleService-Info.plist` exists (iOS)
3. Verify files are gitignored and NOT committed
4. Rebuild: `npm run android` or `npm run ios`

### Push notification not received

**Causes:**
- Token not registered with backend
- FCM server key invalid
- Device doesn't have notification permissions
- FCM is disabled

**Solutions:**

1. Check backend logs for "Token registered" message
2. Verify `FCM_ENABLED=true` in backend `.env`
3. Verify device notification permissions in Settings
4. Test with Firebase Console → Cloud Messaging → Send test message
5. Check device logcat/console for FCM errors

---

**Last Updated:** June 19, 2026  
**Maintained By:** SEKAR DevOps Team  
**Next Review:** December 2026 (annual credential rotation audit)  
**Scope:** Firebase, Google Maps, AWS S3 (staging), MinIO (dev/prod), dotenvx encryption for secrets
