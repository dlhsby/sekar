# Phase 5 Deployment Guide - iOS & Advanced Features

Deployment procedures for Phase 5 features including iOS application, biometric authentication, fraud detection, offline capabilities, and advanced security.

## Overview

Phase 5 introduces:
- **iOS Mobile Application** with feature parity to Android
- **Biometric Authentication** (Face ID/Touch ID, fingerprint on Android)
- **Fraud Detection** algorithms for GPS spoofing and anomaly detection
- **Enhanced Offline Capabilities** with conflict resolution
- **Advanced Security** with certificate pinning and secure storage
- **Apple Push Notification Service (APNs)** for iOS notifications

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [ ] iOS app built and tested on physical devices
- [ ] TestFlight beta testing completed (minimum 10 testers)
- [ ] All Phase 5 features tested (biometrics, fraud detection)
- [ ] iOS-specific unit tests passing
- [ ] App Store assets prepared (screenshots, description, icons)
- [ ] Privacy policy and terms of service updated
- [ ] In-app purchase configured (if applicable)

### Infrastructure Readiness
- [ ] APNs certificate generated and uploaded
- [ ] APNs credentials stored in AWS Secrets Manager
- [ ] Fraud detection ML model deployed
- [ ] Database backup taken
- [ ] CloudWatch alarms configured for fraud alerts

### Apple Developer Account Setup
- [ ] Apple Developer account enrolled (organization)
- [ ] App ID created in Apple Developer Portal
- [ ] Push Notification capability enabled
- [ ] Production APNs certificate generated
- [ ] App Store Connect account set up
- [ ] Team members added with appropriate roles

### Team Readiness
- [ ] iOS deployment process documented
- [ ] App review guidelines reviewed
- [ ] Deployment window scheduled
- [ ] Apple Developer credentials shared securely
- [ ] App Store listing prepared

---

## 2. Apple Developer Setup

### Step 1: Apple Developer Account

**Enroll as Organization:**
1. Go to [Apple Developer Program](https://developer.apple.com/programs/)
2. Enroll as an organization (DLH Surabaya)
3. Cost: $99 USD per year
4. Requires D-U-N-S Number (can be obtained free from Dun & Bradstreet)
5. Approval takes 1-2 days

### Step 2: Create App ID

**In Apple Developer Portal:**
1. Go to Certificates, Identifiers & Profiles
2. Click Identifiers → (+) → App IDs
3. Description: "SEKAR - Worker Tracking System"
4. Bundle ID: `com.wahyutrip.sekar` (explicit, not wildcard)
5. Enable capabilities:
   - Push Notifications
   - Background Modes
   - Location Services
   - Camera
   - Photo Library
6. Register

### Step 3: Generate APNs Certificate

**Method 1: Token-based Authentication (Recommended)**
```bash
# Generate APNs Auth Key (one-time, reusable)
# In Apple Developer Portal:
# 1. Certificates, Identifiers & Profiles → Keys
# 2. (+) → Apple Push Notifications service (APNs)
# 3. Download .p8 file (AuthKey_XXXXXXXXXX.p8)
# 4. Note Key ID and Team ID

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name sekar/apns/auth-key \
  --description "APNs Authentication Key" \
  --secret-string '{
    "key_id": "XXXXXXXXXX",
    "team_id": "YYYYYYYYYY",
    "key_file": "-----BEGIN PRIVATE KEY-----\nMIGTA...\n-----END PRIVATE KEY-----"
  }' \
  --region ap-southeast-1
```

**Method 2: Certificate-based (Legacy)**
```bash
# Generate Certificate Signing Request (CSR) on Mac
openssl req -new -newkey rsa:2048 -nodes \
  -keyout sekar_apns.key \
  -out sekar_apns.csr \
  -subj "/C=ID/ST=East Java/L=Surabaya/O=DLH Surabaya/CN=com.wahyutrip.sekar"

# Upload CSR to Apple Developer Portal → Certificates → (+)
# Select "Apple Push Notification service SSL (Production)"
# Download certificate (.cer)

# Convert to .pem
openssl x509 -in aps_production.cer -inform DER -out sekar_apns.pem
openssl rsa -in sekar_apns.key -out sekar_apns_key.pem

# Combine into .p12
openssl pkcs12 -export -out sekar_apns.p12 \
  -inkey sekar_apns_key.pem \
  -in sekar_apns.pem

# Store in AWS Secrets Manager
```

### Step 4: Configure App Store Connect

**Create App:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. My Apps → (+) → New App
3. Platforms: iOS
4. Name: SEKAR
5. Primary Language: Indonesian (ID)
6. Bundle ID: com.wahyutrip.sekar
7. SKU: SEKAR-2026
8. User Access: Full Access

**App Information:**
- Category: Productivity
- Subcategory: Business
- Content Rights: No (owned by DLH Surabaya)

---

## 3. Environment Variables - Phase 5 Additions

### Backend (.env additions)

```bash
# APNs (iOS Push Notifications)
APNS_ENABLED=true
APNS_KEY_ID={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:key_id}}
APNS_TEAM_ID={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:team_id}}
APNS_KEY_FILE={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:key_file}}
APNS_BUNDLE_ID=com.wahyutrip.sekar
APNS_PRODUCTION=true  # Use production APNs server

# Fraud Detection
FRAUD_DETECTION_ENABLED=true
FRAUD_GPS_SPOOFING_THRESHOLD=0.8  # 80% confidence to flag
FRAUD_VELOCITY_CHECK_ENABLED=true
FRAUD_MAX_SPEED_KMH=100  # Flag if speed > 100 km/h
FRAUD_GEOFENCE_STRICT_MODE=false  # Don't block, just log

# Machine Learning Model
ML_MODEL_ENABLED=true
ML_MODEL_S3_BUCKET=sekar-ml-models
ML_MODEL_PATH=fraud-detection/model-v1.pkl
ML_MODEL_INFERENCE_TIMEOUT=5000  # milliseconds

# Biometric Authentication
BIOMETRIC_AUTH_REQUIRED=false  # Optional for now
BIOMETRIC_FALLBACK_TO_PIN=true

# Advanced Security
CERTIFICATE_PINNING_ENABLED=true
CERTIFICATE_PINS=sha256/XXXXXX,sha256/YYYYYY  # SHA-256 hashes of SSL certificates
SECURITY_HEADERS_STRICT=true
```

### iOS App Configuration

**Info.plist additions:**
```xml
<!-- Biometric Authentication -->
<key>NSFaceIDUsageDescription</key>
<string>SEKAR menggunakan Face ID untuk autentikasi yang aman dan cepat.</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan akses kamera untuk mengambil foto laporan kerja.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>SEKAR memerlukan akses foto untuk melampirkan foto laporan.</string>

<!-- Location Always (Background) -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk melacak kehadiran dan aktivitas kerja Anda secara real-time, bahkan saat aplikasi tidak aktif.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>SEKAR memerlukan akses lokasi untuk clock-in/out dan melacak aktivitas kerja Anda.</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

**Xcode Project Settings:**
- Signing & Capabilities:
  - Team: DLH Surabaya
  - Bundle Identifier: com.wahyutrip.sekar
  - Signing: Automatic
- Capabilities:
  - Push Notifications
  - Background Modes (Location updates, Remote notifications)
  - Keychain Sharing

---

## 4. iOS Build & Code Signing

### Configure Xcode Project

**Podfile for iOS dependencies:**
```ruby
# ios/Podfile
platform :ios, '13.0'
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

target 'SekarApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  # Biometric Authentication
  pod 'RNBiometrics', :path => '../node_modules/react-native-biometrics'

  # Keychain (Secure Storage)
  pod 'RNKeychain', :path => '../node_modules/react-native-keychain'

  # SSL Pinning
  pod 'TrustKit', '~> 1.6'

  # Background Location
  pod 'react-native-background-geolocation', :path => '../node_modules/react-native-background-geolocation'

  # Push Notifications
  pod 'RNFBMessaging', :path => '../node_modules/@react-native-firebase/messaging'

  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

### Build for App Store

**Step 1: Update Version Number**
```bash
cd fe/mobile/ios

# Update version in Xcode or manually
# CFBundleShortVersionString: 1.0.0
# CFBundleVersion: 1
```

**Step 2: Archive Build**
```bash
# Clean build folder
xcodebuild clean -workspace SekarApp.xcworkspace -scheme SekarApp

# Create archive
xcodebuild archive \
  -workspace SekarApp.xcworkspace \
  -scheme SekarApp \
  -archivePath build/SekarApp.xcarchive \
  -configuration Release \
  -allowProvisioningUpdates

# Export IPA for App Store
xcodebuild -exportArchive \
  -archivePath build/SekarApp.xcarchive \
  -exportPath build/SekarApp \
  -exportOptionsPlist ExportOptions.plist
```

**ExportOptions.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YYYYYYYYYY</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

### Upload to App Store Connect

**Using Transporter App (Recommended):**
1. Download Transporter from Mac App Store
2. Sign in with Apple ID
3. Add build: SekarApp.ipa
4. Deliver

**Using command line:**
```bash
# Install Transporter CLI
brew install transporter-cli

# Upload
xcrun altool --upload-app \
  --type ios \
  --file build/SekarApp/SekarApp.ipa \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

---

## 5. Fraud Detection System

### ML Model Deployment

**Train Model (Python):**
```python
# scripts/train_fraud_model.py
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Load historical location data
df = pd.read_csv('location_pings.csv')

# Features: speed, distance from previous, accuracy, time delta
features = ['speed_kmh', 'distance_km', 'accuracy_m', 'time_delta_sec']

# Train anomaly detection model
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(df[features])

# Save model
joblib.dump(model, 'fraud_detection_model.pkl')

# Upload to S3
import boto3
s3 = boto3.client('s3')
s3.upload_file('fraud_detection_model.pkl', 'sekar-ml-models', 'fraud-detection/model-v1.pkl')
```

**Backend Integration:**
```typescript
// be/src/modules/fraud-detection/fraud-detection.service.ts
import * as AWS from 'aws-sdk';
import * as spawn from 'child_process';

export class FraudDetectionService {
  async detectGPSSpoofing(locationPings: LocationPing[]): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];

    for (let i = 1; i < locationPings.length; i++) {
      const prev = locationPings[i - 1];
      const curr = locationPings[i];

      // Calculate speed
      const distance = this.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      const timeDelta = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // seconds
      const speedKmh = (distance / timeDelta) * 3600;

      // Check 1: Impossible speed
      if (speedKmh > 100) {
        alerts.push({
          type: 'impossible_speed',
          confidence: 0.95,
          details: `Speed: ${speedKmh.toFixed(1)} km/h`,
          worker_id: curr.worker_id,
          timestamp: curr.timestamp,
        });
      }

      // Check 2: Low GPS accuracy (potential spoofing)
      if (curr.accuracy > 100) {
        alerts.push({
          type: 'low_accuracy',
          confidence: 0.6,
          details: `Accuracy: ${curr.accuracy}m`,
          worker_id: curr.worker_id,
          timestamp: curr.timestamp,
        });
      }

      // Check 3: ML model prediction
      const mlScore = await this.getMLinferenceScore({
        speed_kmh: speedKmh,
        distance_km: distance,
        accuracy_m: curr.accuracy,
        time_delta_sec: timeDelta,
      });

      if (mlScore > 0.8) {
        alerts.push({
          type: 'ml_anomaly',
          confidence: mlScore,
          details: 'Machine learning model flagged anomalous behavior',
          worker_id: curr.worker_id,
          timestamp: curr.timestamp,
        });
      }
    }

    return alerts;
  }

  private async getMLinferenceScore(features: any): Promise<number> {
    // Call Python ML model via AWS Lambda or local subprocess
    // For simplicity, using subprocess here (not recommended for production)
    // In production, use SageMaker or Lambda with ML inference

    const result = spawn.spawnSync('python3', [
      'scripts/infer_fraud.py',
      JSON.stringify(features),
    ]);

    return parseFloat(result.stdout.toString());
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
```

### Fraud Alerts Table

```sql
-- Migration: CreateFraudAlertsTable
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'impossible_speed', 'low_accuracy', 'ml_anomaly', 'geofence_breach'
    confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
    details TEXT,
    location_ping_id UUID REFERENCES location_pings(id),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken VARCHAR(100), -- 'dismissed', 'warning_sent', 'investigation', 'account_suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_worker_id ON fraud_alerts(worker_id);
CREATE INDEX idx_fraud_alerts_reviewed ON fraud_alerts(reviewed);
CREATE INDEX idx_fraud_alerts_created_at ON fraud_alerts(created_at DESC);
```

---

## 6. Biometric Authentication Setup

### iOS: Face ID / Touch ID

```typescript
// fe/mobile/src/services/biometric.service.ts
import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricService {
  async checkBiometricAvailability(): Promise<{ available: boolean; type: string }> {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    return {
      available,
      type: biometryType, // 'FaceID', 'TouchID', 'Biometrics' (Android)
    };
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    const rnBiometrics = new ReactNativeBiometrics();

    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Autentikasi dengan Face ID',
        cancelButtonText: 'Batal',
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async createBiometricKey(): Promise<string> {
    // Create public/private key pair in secure enclave
    const rnBiometrics = new ReactNativeBiometrics();

    const { publicKey } = await rnBiometrics.createKeys();
    return publicKey;
  }

  async signWithBiometrics(payload: string): Promise<string> {
    // Sign payload with private key (requires biometric auth)
    const rnBiometrics = new ReactNativeBiometrics();

    const { success, signature } = await rnBiometrics.createSignature({
      promptMessage: 'Konfirmasi dengan Face ID',
      payload,
    });

    if (!success) {
      throw new Error('Biometric signature failed');
    }

    return signature;
  }
}
```

### Backend: Biometric Key Registration

```typescript
// be/src/modules/auth/auth.controller.ts
@Post('register-biometric-key')
@UseGuards(JwtAuthGuard)
async registerBiometricKey(
  @GetUser() user: User,
  @Body('publicKey') publicKey: string,
) {
  // Store user's biometric public key
  await this.usersService.updateBiometricKey(user.id, publicKey);

  return { message: 'Biometric key registered successfully' };
}

@Post('login-biometric')
async loginWithBiometric(
  @Body('userId') userId: string,
  @Body('signature') signature: string,
  @Body('payload') payload: string,
) {
  // Verify signature with stored public key
  const user = await this.usersService.findById(userId);

  if (!user.biometric_public_key) {
    throw new UnauthorizedException('Biometric not registered');
  }

  const isValid = this.cryptoService.verifySignature(
    user.biometric_public_key,
    payload,
    signature,
  );

  if (!isValid) {
    throw new UnauthorizedException('Invalid biometric signature');
  }

  // Generate JWT token
  const token = await this.authService.generateToken(user);
  return { access_token: token };
}
```

---

## 7. App Store Submission

### Pre-Submission Checklist

- [ ] App tested on physical devices (iPhone 12+, iOS 15+)
- [ ] All features working (clock-in, reports, tasks, assets)
- [ ] No crashes or critical bugs
- [ ] Performance acceptable (app startup < 3s)
- [ ] Privacy policy URL accessible
- [ ] Support URL or email provided
- [ ] Screenshots prepared (6.5" and 5.5" displays)
- [ ] App icon finalized (1024x1024 PNG)
- [ ] App description written (Indonesian + English)
- [ ] Keywords selected (max 100 characters)
- [ ] Promotional text written (170 characters)

### App Store Listing

**App Name:** SEKAR - Sistem Evaluasi Kinerja

**Subtitle:** Tracking & Laporan Kerja Real-time

**Description (Indonesian):**
```
SEKAR adalah aplikasi tracking dan manajemen kerja untuk pekerja lapangan DLH Surabaya.

FITUR UTAMA:
✅ Clock-in/out otomatis dengan GPS
✅ Tracking lokasi real-time
✅ Laporan kerja digital dengan foto/video
✅ Manajemen tugas dan jadwal
✅ Tracking aset dan peralatan
✅ Mode offline dengan sinkronisasi otomatis
✅ Notifikasi pengingat shift

KEAMANAN:
🔒 Autentikasi biometrik (Face ID/Touch ID)
🔒 Data terenkripsi end-to-end
🔒 Verifikasi GPS untuk mencegah fraud

UNTUK PEKERJA:
📍 Clock-in/out mudah dengan lokasi otomatis
📝 Buat laporan kerja lengkap dengan foto
📋 Lihat tugas dan jadwal harian
🔔 Terima notifikasi pengingat

UNTUK SUPERVISOR:
👥 Monitor kehadiran tim real-time
📊 Dashboard analitik dan laporan
✅ Assign tugas ke pekerja
📍 Lihat lokasi pekerja di peta

Aplikasi resmi dari Dinas Lingkungan Hidup Kota Surabaya.
```

**Keywords:**
```
tracking,gps,absensi,laporan,kerja,dinas,surabaya,pekerja,supervisor,manajemen
```

**Promotional Text:**
```
Tracking pekerja lapangan dengan GPS real-time, laporan digital, dan manajemen tugas lengkap. Tingkatkan produktivitas tim Anda!
```

**Screenshots:**
- Login screen
- Dashboard (worker view)
- Map with real-time tracking (supervisor view)
- Clock-in screen with selfie
- Report creation form
- Task list
- Asset QR scanner

**App Preview Video (Optional):**
- 30-second demo showing main features
- Format: MP4, H.264, 1080p

### Submit for Review

**In App Store Connect:**
1. Select app version (1.0.0)
2. Upload build from Xcode or Transporter
3. Fill in "What's New in This Version"
4. Add screenshots and app preview
5. Set pricing (Free)
6. Select availability (Indonesia only)
7. App Review Information:
   - Demo account credentials (supervisor + worker)
   - Notes: "App requires DLH Surabaya employee account"
8. Submit for Review

**Review Timeline:**
- Typical: 24-48 hours
- First submission: May take up to 5-7 days
- Rejections are common - respond promptly

### Common Rejection Reasons

**Reason 1: Requires login without clear explanation**
- **Solution:** Add screenshots showing app purpose before login
- Add "This app is for DLH Surabaya employees only" in description

**Reason 2: Background location usage not justified**
- **Solution:** Provide clear explanation in Info.plist usage description
- Show location tracking feature in screenshots

**Reason 3: Crashes during review**
- **Solution:** Provide stable demo accounts
- Test thoroughly on all iOS versions (15, 16, 17)

**Reason 4: Privacy policy missing or incomplete**
- **Solution:** Ensure privacy policy covers:
  - Location tracking
  - Photo/video collection
  - Data storage and retention
  - Third-party services (AWS, Firebase)

---

## 8. Deployment Procedure

### Step 1: Backend APNs Integration

```bash
# Update backend to support APNs
cd be

# Install APNs library
npm install apn @types/apn

# Update environment variables
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=APNS_ENABLED,Value=true \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=APNS_KEY_ID,Value={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:key_id}} \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=APNS_TEAM_ID,Value={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:team_id}}
```

### Step 2: Deploy iOS App to TestFlight

```bash
# Build and upload (as shown in section 4)
cd fe/mobile/ios
xcodebuild archive -workspace SekarApp.xcworkspace -scheme SekarApp -archivePath build/SekarApp.xcarchive
xcodebuild -exportArchive -archivePath build/SekarApp.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist
```

**TestFlight Internal Testing:**
1. Add internal testers (team members)
2. Distribute build via TestFlight
3. Collect feedback and fix bugs
4. Iterate until stable

**TestFlight External Testing (Optional):**
1. Add external beta testers (10-100 testers)
2. Requires App Review (lightweight)
3. Test for 1-2 weeks
4. Collect feedback via TestFlight

### Step 3: Production Deployment

**iOS:**
1. Submit to App Store (as shown in section 7)
2. Wait for approval (24-48 hours)
3. Once approved, manually release or auto-release
4. Monitor crash reports in App Store Connect

**Android:**
1. Build updated APK with Phase 5 features
2. Upload to Google Play Console
3. Release to production

**Backend:**
```bash
git checkout main
git merge staging
git tag -a v5.0.0 -m "Phase 5 Production Release - iOS & Advanced Features"
git push origin main v5.0.0

# CI/CD will deploy automatically
```

---

## 9. Monitoring - Phase 5 Additions

### iOS-Specific Metrics

**App Store Connect Analytics:**
- Impressions and downloads
- Crash rate
- Average session duration
- Ratings and reviews

**Firebase Analytics (iOS):**
- User engagement
- Screen views
- Custom events (clock-in, report submitted)
- User retention

### Fraud Detection Metrics

```typescript
// Custom CloudWatch metrics
await logMetric('FraudAlertGenerated', 1, 'Count');
await logMetric('FraudAlertDismissed', 1, 'Count');
await logMetric('FraudAlertInvestigated', 1, 'Count');
await logMetric('GPSSpoofingDetected', 1, 'Count');
```

### CloudWatch Alarms

**Alarm: High Fraud Detection Rate**
```yaml
AlarmName: SEKAR-Prod-FraudDetectionHigh
MetricName: FraudAlertGenerated
Namespace: SEKAR/FraudDetection
Statistic: Sum
Period: 3600  # 1 hour
EvaluationPeriods: 2
Threshold: 10  # More than 10 alerts per hour
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-1:ACCOUNT_ID:sekar-high-alerts
```

---

## 10. Certificate Pinning Setup

**iOS Implementation:**
```swift
// ios/SekarApp/TrustKitConfig.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>TSKPinnedDomains</key>
    <dict>
        <key>api.sekar.DLH-sby.go.id</key>
        <dict>
            <key>TSKPublicKeyHashes</key>
            <array>
                <string>sha256/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=</string>
                <string>sha256/YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY=</string>
            </array>
            <key>TSKEnforcePinning</key>
            <true/>
            <key>TSKIncludeSubdomains</key>
            <false/>
        </dict>
    </dict>
</dict>
</plist>
```

**Get Certificate SHA-256 Hash:**
```bash
# Extract certificate from server
openssl s_client -connect api.sekar.DLH-sby.go.id:443 < /dev/null | \
  openssl x509 -outform DER > cert.der

# Get SHA-256 hash
openssl x509 -inform DER -in cert.der -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  base64
```

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-21
**Status:** Active - Phase 5
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`phase-4-deployment.md`](./phase-4-deployment.md)
